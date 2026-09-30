"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { opportunities, opportunityActions, dealStages, fieldDefinitions } from "@/db/schema";
import { requirePermission, AccessDeniedError } from "@/lib/require-permission";
import { getCurrentUser, hasPermission } from "@/lib/current-user";
import { parseCustomFieldValues, IFieldDefinition } from "@/lib/custom-fields";

async function getFieldDefs(): Promise<IFieldDefinition[]> {
  const rows = await db.select().from(fieldDefinitions).where(eq(fieldDefinitions.entityType, "opportunity"));
  return rows as unknown as IFieldDefinition[];
}

// Companies/Contacts gates everything behind a single permission; Deals has
// two view levels (own vs all), so this mirrors requirePermission but
// accepts either key.
async function requireViewAccess() {
  const user = await getCurrentUser();
  if (!user || !(hasPermission(user, "opportunities.view_own") || hasPermission(user, "opportunities.view_all"))) {
    throw new AccessDeniedError();
  }
  return user;
}

function toNumber(v: FormDataEntryValue | null, fallback = 0) {
  if (v === null || v === "") return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

async function computeWeighted(value: number, stageId: number) {
  const stage = await db.query.dealStages.findFirst({ where: eq(dealStages.id, stageId) });
  const probability = stage?.probability ?? 0;
  return { probability, weightedValue: (value * probability) / 100 };
}

export async function createDeal(formData: FormData) {
  const user = await requirePermission("opportunities.create");

  const title = String(formData.get("title") || "").trim();
  if (!title) throw new Error("Deal title is required.");

  const companyId = toNumber(formData.get("companyId"), 0);
  if (!companyId) throw new Error("A company is required.");

  const stageId = toNumber(formData.get("stageId"));
  if (!stageId) throw new Error("A deal stage is required.");

  let ownerId = user.id;
  const requestedOwner = formData.get("ownerId");
  if (requestedOwner && String(requestedOwner) !== user.id) {
    await requirePermission("opportunities.create_for_others");
    ownerId = String(requestedOwner);
  }

  const value = toNumber(formData.get("value"));
  const { probability, weightedValue } = await computeWeighted(value, stageId);

  const contactId = formData.get("contactId") ? toNumber(formData.get("contactId")) : null;
  const description = String(formData.get("description") || "").trim() || null;

  const fieldDefs = await getFieldDefs();
  const customFields = parseCustomFieldValues(formData, fieldDefs);

  // `reference` must be unique and not-null at insert time, but we want it
  // derived from the new row's own id (e.g. "OPP-0042"). Insert with a
  // throwaway unique placeholder, then rename it once we have the real id -
  // avoids any race on a hand-rolled counter.
  const [inserted] = await db
    .insert(opportunities)
    .values({
      reference: `TEMP-${randomUUID()}`,
      title,
      description,
      companyId,
      contactId: contactId || null,
      ownerId,
      stageId,
      value: String(value),
      probability,
      weightedValue: String(weightedValue),
      isOpen: true,
      customFields,
    })
    .returning();

  const reference = `OPP-${String(inserted.id).padStart(4, "0")}`;
  const [deal] = await db
    .update(opportunities)
    .set({ reference })
    .where(eq(opportunities.id, inserted.id))
    .returning();

  revalidatePath("/deals");
  return deal;
}

export async function updateDeal(id: number, formData: FormData) {
  await requirePermission("opportunities.edit");

  const title = String(formData.get("title") || "").trim();
  if (!title) throw new Error("Deal title is required.");

  const companyId = toNumber(formData.get("companyId"), 0);
  if (!companyId) throw new Error("A company is required.");

  const value = toNumber(formData.get("value"));
  const existing = await db.query.opportunities.findFirst({ where: eq(opportunities.id, id) });
  if (!existing) throw new Error("Deal not found.");

  const { probability, weightedValue } = await computeWeighted(value, existing.stageId);

  const contactId = formData.get("contactId") ? toNumber(formData.get("contactId")) : null;
  const description = String(formData.get("description") || "").trim() || null;

  const fieldDefs = await getFieldDefs();
  const customFields = parseCustomFieldValues(formData, fieldDefs);

  await db
    .update(opportunities)
    .set({
      title,
      description,
      companyId,
      contactId: contactId || null,
      value: String(value),
      probability,
      weightedValue: String(weightedValue),
      customFields,
      updatedAt: new Date(),
    })
    .where(eq(opportunities.id, id));

  revalidatePath("/deals");
}

// Move a deal to a different (non-closing) stage - used for drag & drop.
export async function moveDealStage(id: number, stageId: number) {
  await requirePermission("opportunities.edit");

  const stage = await db.query.dealStages.findFirst({ where: eq(dealStages.id, stageId) });
  if (!stage) throw new Error("Stage not found.");
  if (stage.isClosedWon || stage.isClosedLost) {
    throw new Error("Use the close dialog to move a deal into a closing stage.");
  }

  const deal = await db.query.opportunities.findFirst({ where: eq(opportunities.id, id) });
  if (!deal) throw new Error("Deal not found.");

  const weightedValue = (Number(deal.value ?? 0) * stage.probability) / 100;

  await db
    .update(opportunities)
    .set({
      stageId,
      probability: stage.probability,
      weightedValue: String(weightedValue),
      updatedAt: new Date(),
    })
    .where(eq(opportunities.id, id));

  revalidatePath("/deals");
}

// Close a deal as won or lost - triggered when dragging into a closing stage,
// or from the deal detail panel.
export async function closeDeal(
  id: number,
  stageId: number,
  options: { finalValue?: number; lostReason?: string }
) {
  await requirePermission("opportunities.close");

  const stage = await db.query.dealStages.findFirst({ where: eq(dealStages.id, stageId) });
  if (!stage) throw new Error("Stage not found.");
  if (!stage.isClosedWon && !stage.isClosedLost) {
    throw new Error("That stage is not a closing stage.");
  }
  if (stage.isClosedLost && !options.lostReason) {
    throw new Error("A lost reason is required to mark a deal as lost.");
  }

  const deal = await db.query.opportunities.findFirst({ where: eq(opportunities.id, id) });
  if (!deal) throw new Error("Deal not found.");

  const finalValue = stage.isClosedWon
    ? options.finalValue ?? Number(deal.value ?? 0)
    : options.finalValue ?? 0;

  await db
    .update(opportunities)
    .set({
      stageId,
      probability: stage.probability,
      weightedValue: String((finalValue * stage.probability) / 100),
      isOpen: false,
      closeDate: new Date(),
      finalValue: String(finalValue),
      lostReason: stage.isClosedLost ? options.lostReason ?? null : null,
      updatedAt: new Date(),
    })
    .where(eq(opportunities.id, id));

  revalidatePath("/deals");
}

export async function reopenDeal(id: number) {
  await requirePermission("opportunities.close");

  const openStage = await db.query.dealStages.findFirst({
    where: and(eq(dealStages.isClosedWon, false), eq(dealStages.isClosedLost, false)),
    orderBy: (t, { asc }) => [asc(t.sortOrder)],
  });
  if (!openStage) throw new Error("No open stage is configured.");

  const deal = await db.query.opportunities.findFirst({ where: eq(opportunities.id, id) });
  if (!deal) throw new Error("Deal not found.");

  const weightedValue = (Number(deal.value ?? 0) * openStage.probability) / 100;

  await db
    .update(opportunities)
    .set({
      stageId: openStage.id,
      probability: openStage.probability,
      weightedValue: String(weightedValue),
      isOpen: true,
      closeDate: null,
      finalValue: null,
      lostReason: null,
      updatedAt: new Date(),
    })
    .where(eq(opportunities.id, id));

  revalidatePath("/deals");
}

export async function deleteDeal(id: number) {
  await requirePermission("opportunities.delete");
  await db.delete(opportunities).where(eq(opportunities.id, id));
  revalidatePath("/deals");
}

export async function logAction(dealId: number, formData: FormData) {
  const user = await requireViewAccess();

  const method = String(formData.get("method") || "None") as
    | "None"
    | "Telephonic"
    | "Email"
    | "In Person";
  const notes = String(formData.get("notes") || "").trim();
  const nextAction = String(formData.get("nextAction") || "").trim() || null;
  const nextActionDateRaw = formData.get("nextActionDate");
  const nextActionDate = nextActionDateRaw ? new Date(String(nextActionDateRaw)) : null;

  await db.insert(opportunityActions).values({
    opportunityId: dealId,
    actionById: user.id,
    method,
    notes: notes || null,
    nextAction,
    nextActionDate,
  });

  // Mirror the latest logged next action onto the deal itself, so it shows
  // on the board/detail panel without opening the follow-up history. Only
  // overwrite when this log entry actually set one.
  if (nextAction) {
    await db
      .update(opportunities)
      .set({ nextAction, nextActionDate, updatedAt: new Date() })
      .where(eq(opportunities.id, dealId));
  }

  revalidatePath("/deals");
}
