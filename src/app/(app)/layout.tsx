import { redirect } from "next/navigation";
import { getCurrentUser, hasPermission } from "@/lib/current-user";
import SignOutButton from "@/components/SignOutButton";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/sign-in");

  const navItems = [
    { href: "/dashboard", label: "Dashboard", show: true },
    { href: "/deals", label: "Deals", show: hasPermission(user, "opportunities.view_own") || hasPermission(user, "opportunities.view_all") },
    { href: "/companies", label: "Companies & Contacts", show: hasPermission(user, "companies.view") },
    { href: "/reports", label: "Reports", show: hasPermission(user, "reports.view_all") },
    { href: "/admin", label: "Admin", show: hasPermission(user, "admin.manage_users") || hasPermission(user, "admin.manage_roles") || hasPermission(user, "admin.manage_fields") || hasPermission(user, "admin.manage_stages") }
  ];

  return (
    <div className="app-shell">
      <nav className="side-nav">
        <div className="side-nav-brand">BridgePoint</div>
        {navItems.filter(i => i.show).map(item => (
          <a key={item.href} href={item.href} className="side-nav-link">{item.label}</a>
        ))}
        <div style={{ marginTop: "auto", padding: "20px", fontSize: 12, color: "rgba(255,255,255,0.7)" }}>
          {user.name} · {user.role}
          <div style={{ marginTop: 8 }}>
            <SignOutButton />
          </div>
        </div>
      </nav>
      <div className="main-content">{children}</div>
    </div>
  );
}
