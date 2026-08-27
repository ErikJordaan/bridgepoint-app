import { redirect } from "next/navigation";
import { getCurrentUser, hasPermission } from "@/lib/current-user";

export default async function AdminIndexPage() {
  const user = await getCurrentUser();
  if (hasPermission(user, "admin.manage_users")) redirect("/admin/users");
  if (hasPermission(user, "admin.manage_roles")) redirect("/admin/roles");
  if (hasPermission(user, "admin.manage_stages")) redirect("/admin/stages");
  if (hasPermission(user, "admin.manage_fields")) redirect("/admin/fields");
  redirect("/dashboard");
}
