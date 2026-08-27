"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { fieldDefinitions } from "@/db/schema";
import { requirePermission } from "@/lib/require-permission";

function slugify(label: string): string {
  return label.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

export async function createField(formData: FormData) {
  await requirePermission("admin.manage_fields");

  const entityType = formData.get("entityType") as "opportunity" | "company" | "contact";
  const label = formData.get("label") as string;
  const fieldType = formData.get("fieldType") as string;
  const required = formData.get("required") === "on";
  const optionsRaw = (formData.get("options") as string) || "";
  const options = fieldType === "select"
    ? optionsRaw.split(",").map(o => o.trim()).filter(Boolean)
    : undefined;

  const existing = await db.select().from(fieldDefinitions).where(eq(fieldDefinitions.entityType, entityType));
  const sortOrder = existing.length > 0 ? Math.max(...existing.map(f => f.sortOrder)) + 1 : 1;

  await db.insert(fieldDefinitions).values({
    entityType,
    key: slugify(label),
    label,
    fieldType: fieldType as any,
    options,
    required,
    sortOrder
  });
  revalidatePath("/admin/fields");
}

export async function updateField(formData: FormData) {
  await requirePermission("admin.manage_fields");

  const id = parseInt(formData.get("id") as string, 10);
  const label = formData.get("label") as string;
  const required = formData.get("required") === "on";
  const optionsRaw = (formData.get("options") as string) || "";
  const fieldType = formData.get("fieldType") as string;
  const options = fieldType === "select"
    ? optionsRaw.split(",").map(o => o.trim()).filter(Boolean)
    : undefined;

  // Note: the field's key and type are intentionally not editable after
  // creation - changing them would orphan existing stored values on records
  // that already used the old key/type. Delete and recreate instead if a
  // fundamentally different field is needed.
  await db.update(fieldDefinitions).set({ label, required, options }).where(eq(fieldDefinitions.id, id));
  revalidatePath("/admin/fields");
}

export async function deleteField(formData: FormData) {
  await requirePermission("admin.manage_fields");
  const id = parseInt(formData.get("id") as string, 10);
  await db.delete(fieldDefinitions).where(eq(fieldDefinitions.id, id));
  revalidatePath("/admin/fields");
}
