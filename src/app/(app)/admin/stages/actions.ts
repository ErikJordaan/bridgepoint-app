"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { dealStages } from "@/db/schema";
import { requirePermission } from "@/lib/require-permission";

export async function createStage(formData: FormData) {
  await requirePermission("admin.manage_stages");

  const name = formData.get("name") as string;
  const probability = parseInt(formData.get("probability") as string, 10);
  const isClosedWon = formData.get("isClosedWon") === "on";
  const isClosedLost = formData.get("isClosedLost") === "on";

  // New stages go at the end by default - reorder later via the sortOrder edit.
  const existing = await db.select().from(dealStages);
  const sortOrder = existing.length > 0 ? Math.max(...existing.map(s => s.sortOrder)) + 1 : 1;

  await db.insert(dealStages).values({ name, probability, sortOrder, isClosedWon, isClosedLost });
  revalidatePath("/admin/stages");
}

export async function updateStage(formData: FormData) {
  await requirePermission("admin.manage_stages");

  const id = parseInt(formData.get("id") as string, 10);
  const name = formData.get("name") as string;
  const probability = parseInt(formData.get("probability") as string, 10);
  const sortOrder = parseInt(formData.get("sortOrder") as string, 10);
  const isClosedWon = formData.get("isClosedWon") === "on";
  const isClosedLost = formData.get("isClosedLost") === "on";

  await db.update(dealStages)
    .set({ name, probability, sortOrder, isClosedWon, isClosedLost })
    .where(eq(dealStages.id, id));
  revalidatePath("/admin/stages");
}

export async function deleteStage(id: number) {
  await requirePermission("admin.manage_stages");
  await db.delete(dealStages).where(eq(dealStages.id, id));
  revalidatePath("/admin/stages");
}
