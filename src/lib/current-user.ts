import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { auth } from "./auth";
import { db } from "@/db";
import { roles, rolePermissions } from "@/db/schema";

export interface ICurrentUser {
  id: string;
  name: string;
  email: string;
  role: string;
  permissions: Set<string>;
}

// Loads the signed-in user plus the resolved set of permission keys their
// current role has - call this once per request/page and pass the result
// down, rather than re-checking role membership scattered through the UI.
export async function getCurrentUser(): Promise<ICurrentUser | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;

  const isActive = (session.user as any).active !== false;
  if (!isActive) {
    // Deactivated account with a still-valid session token - kill the
    // session server-side rather than just hiding the UI, so a deactivated
    // user can't keep using an already-open tab.
    await auth.api.signOut({ headers: await headers() }).catch(() => {});
    return null;
  }

  const roleName = (session.user as any).role as string;

  const role = await db.query.roles.findFirst({ where: eq(roles.name, roleName) });
  let permissions = new Set<string>();
  if (role) {
    const grants = await db.select().from(rolePermissions).where(eq(rolePermissions.roleId, role.id));
    permissions = new Set(grants.map(g => g.permissionKey));
  }

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: roleName,
    permissions
  };
}

export function hasPermission(user: ICurrentUser | null, key: string): boolean {
  return !!user?.permissions.has(key);
}
