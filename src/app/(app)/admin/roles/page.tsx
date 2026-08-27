import { db } from "@/db";
import { roles, rolePermissions } from "@/db/schema";
import { requirePermission, AccessDeniedError } from "@/lib/require-permission";
import RolesClient from "./RolesClient";

export default async function RolesPage() {
  try {
    await requirePermission("admin.manage_roles");
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return <div className="error-banner">{err.message}</div>;
    }
    throw err;
  }

  const allRoles = await db.select().from(roles).orderBy(roles.name);
  const allGrants = await db.select().from(rolePermissions);

  const rolesWithPermissions = allRoles.map(r => ({
    ...r,
    permissionKeys: allGrants.filter(g => g.roleId === r.id).map(g => g.permissionKey)
  }));

  return <RolesClient roles={rolesWithPermissions} />;
}
