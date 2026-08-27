import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentUser, hasPermission } from "@/lib/current-user";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const canManageUsers = hasPermission(user, "admin.manage_users");
  const canManageRoles = hasPermission(user, "admin.manage_roles");
  const canManageFields = hasPermission(user, "admin.manage_fields");
  const canManageStages = hasPermission(user, "admin.manage_stages");

  if (!canManageUsers && !canManageRoles && !canManageFields && !canManageStages) {
    redirect("/dashboard");
  }

  const tabs = [
    { href: "/admin/users", label: "Users", show: canManageUsers },
    { href: "/admin/roles", label: "Roles & Permissions", show: canManageRoles },
    { href: "/admin/stages", label: "Deal Stages", show: canManageStages },
    { href: "/admin/fields", label: "Custom Fields", show: canManageFields }
  ];

  return (
    <div>
      <h1 style={{ color: "var(--brand-blue)" }}>Admin</h1>
      <div className="admin-tabs">
        {tabs.filter(t => t.show).map(t => (
          <Link key={t.href} href={t.href} className="admin-tab">{t.label}</Link>
        ))}
      </div>
      {children}
    </div>
  );
}
