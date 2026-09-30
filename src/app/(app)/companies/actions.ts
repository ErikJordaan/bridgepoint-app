"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { companies, contacts, fieldDefinitions } from "@/db/schema";
import { requirePermission } from "@/lib/require-permission";
import { parseCustomFieldValues } from "@/lib/custom-fields";

async function getFieldDefs(entityType: "company" | "contact") {
  return db.select().from(fieldDefinitions).where(eq(fieldDefinitions.entityType, entityType));
}

export async function createCompany(formData: FormData) {
  await requirePermission("companies.edit");

  const name = (formData.get("name") as string).trim();
  const phone = (formData.get("phone") as string) || null;
  const fieldDefs = await getFieldDefs("company");
  const customFields = parseCustomFieldValues(formData, fieldDefs);

  const [created] = await db.insert(companies).values({ name, phone, customFields }).returning();
  revalidatePath("/companies");
  return created;
}

export async function updateCompany(formData: FormData) {
  await requirePermission("companies.edit");

  const id = parseInt(formData.get("id") as string, 10);
  const name = (formData.get("name") as string).trim();
  const phone = (formData.get("phone") as string) || null;
  const active = formData.get("active") === "on";
  const fieldDefs = await getFieldDefs("company");
  const customFields = parseCustomFieldValues(formData, fieldDefs);

  await db.update(companies).set({ name, phone, active, customFields, updatedAt: new Date() }).where(eq(companies.id, id));
  revalidatePath("/companies");
}

export async function createContact(formData: FormData) {
  await requirePermission("companies.edit");

  const companyId = parseInt(formData.get("companyId") as string, 10);
  const name = (formData.get("name") as string).trim();
  const email = (formData.get("email") as string) || null;
  const mobile = (formData.get("mobile") as string) || null;
  const fieldDefs = await getFieldDefs("contact");
  const customFields = parseCustomFieldValues(formData, fieldDefs);

  await db.insert(contacts).values({ companyId, name, email, mobile, customFields });
  revalidatePath("/companies");
}

export async function updateContact(formData: FormData) {
  await requirePermission("companies.edit");

  const id = parseInt(formData.get("id") as string, 10);
  const name = (formData.get("name") as string).trim();
  const email = (formData.get("email") as string) || null;
  const mobile = (formData.get("mobile") as string) || null;
  const active = formData.get("active") === "on";
  const fieldDefs = await getFieldDefs("contact");
  const customFields = parseCustomFieldValues(formData, fieldDefs);

  await db.update(contacts).set({ name, email, mobile, active, customFields, updatedAt: new Date() }).where(eq(contacts.id, id));
  revalidatePath("/companies");
}
