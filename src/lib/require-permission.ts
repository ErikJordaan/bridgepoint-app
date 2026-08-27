import { getCurrentUser, hasPermission, ICurrentUser } from "./current-user";

export class AccessDeniedError extends Error {
  constructor() {
    super("You don't have permission to view this page.");
    this.name = "AccessDeniedError";
  }
}

// Call at the top of a Server Component page. Throws if the signed-in user
// doesn't have the given permission - paired with each admin section's
// error.tsx (or a try/catch at the call site) to show a friendly message
// rather than a raw crash.
export async function requirePermission(permissionKey: string): Promise<ICurrentUser> {
  const user = await getCurrentUser();
  if (!user || !hasPermission(user, permissionKey)) {
    throw new AccessDeniedError();
  }
  return user;
}
