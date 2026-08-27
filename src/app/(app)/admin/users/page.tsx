import { db } from "@/db";
import { roles } from "@/db/schema";
import { user as userTable } from "@/db/auth-schema";
import { requirePermission, AccessDeniedError } from "@/lib/require-permission";
import UsersClient from "./UsersClient";

export default async function UsersPage() {
  try {
    await requirePermission("admin.manage_users");
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return <div className="error-banner">{err.message}</div>;
    }
    throw err;
  }

  const users = await db.select().from(userTable).orderBy(userTable.name);
  const allRoles = await db.select().from(roles).orderBy(roles.name);

  return <UsersClient users={users} roles={allRoles.map(r => r.name)} />;
}
