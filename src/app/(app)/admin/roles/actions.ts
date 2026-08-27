"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { roles, rolePermissions } from "@/db/schema";
import { user as userTable } from "@/db/auth-schema";
import { requirePermission } from "@/lib/require-permission";
import { PERMISSIONS } from "@/lib/permissions";

export async function createRole(formData: FormData) {
  await requirePermission("admin.manage_roles");
  const name = (formData.get("name") as string).trim();
  const description = (formData.get("description") as string) || null;
  await db.insert(roles).values({ name, description });
  revalidatePath("/admin/roles");
}

export async function renameRole(formData: FormData) {
  await requirePermission("admin.manage_roles");
  const id = parseInt(formData.get("id") as string, 10);
  const name = (formData.get("name") as string).trim();
  const description = (formData.get("description") as string) || null;

  const existing = await db.query.roles.findFirst({ where: eq(roles.id, id) });
  if (!existing) return;

  await db.update(roles).set({ name, description }).where(eq(roles.id, id));

  // Roles are referenced by NAME on the user record (not a foreign key), for
  // simplicity - so a rename needs to cascade to every user who currently
  // has the old name, or they'd silently end up with no matching role.
  if (existing.name !== name) {
    await db.update(userTable).set({ role: name }).where(eq(userTable.role, existing.name));
  }

  revalidatePath("/admin/roles");
  revalidatePath("/admin/users");
}

export async function deleteRole(formData: FormData) {
  await requirePermission("admin.manage_roles");
  const id = parseInt(formData.get("id") as string, 10);

  const role = await db.query.roles.findFirst({ where: eq(roles.id, id) });
  if (!role) return;

  const usersWithRole = await db.select().from(userTable).where(eq(userTable.role, role.name));
  if (usersWithRole.length > 0) {
    throw new Error(`Can't delete "${role.name}" - ${usersWithRole.length} user(s) still have this role. Reassign them first.`);
  }

  await db.delete(roles).where(eq(roles.id, id));
  revalidatePath("/admin/roles");
}

// Replaces a role's entire permission set with exactly the keys provided -
// simpler and less error-prone than diffing individual checkbox changes.
export async function saveRolePermissions(roleId: number, grantedKeys: string[]) {
  await requirePermission("admin.manage_roles");

  const validKeys = new Set(PERMISSIONS.map(p => p.key));
  const filtered = grantedKeys.filter(k => validKeys.has(k));

  await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
  if (filtered.length > 0) {
    await db.insert(rolePermissions).values(filtered.map(key => ({ roleId, permissionKey: key })));
  }
  revalidatePath("/admin/roles");
}
