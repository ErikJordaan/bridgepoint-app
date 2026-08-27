"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { user as userTable } from "@/db/auth-schema";
import { requirePermission } from "@/lib/require-permission";
import { auth } from "@/lib/auth";

export async function createUser(formData: FormData) {
  await requirePermission("admin.manage_users");

  const email = (formData.get("email") as string).trim().toLowerCase();
  const name = (formData.get("name") as string).trim();
  const password = formData.get("password") as string;
  const role = formData.get("role") as string;

  await auth.api.signUpEmail({
    body: { email, password, name, role } as any
  });

  revalidatePath("/admin/users");
}

export async function updateUser(formData: FormData) {
  await requirePermission("admin.manage_users");

  const id = formData.get("id") as string;
  const name = (formData.get("name") as string).trim();
  const role = formData.get("role") as string;
  const active = formData.get("active") === "on";

  await db.update(userTable).set({ name, role, active }).where(eq(userTable.id, id));
  revalidatePath("/admin/users");
}
