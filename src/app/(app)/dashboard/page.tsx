import { getCurrentUser } from "@/lib/current-user";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  return (
    <div>
      <h1 style={{ color: "var(--brand-blue)" }}>Dashboard</h1>
      <p>Welcome, {user?.name}. You're signed in as <strong>{user?.role}</strong>.</p>
      <div className="card" style={{ marginTop: 16 }}>
        <p style={{ margin: 0, color: "#605e5c" }}>
          This is a placeholder — the real Dashboard (open deals, follow-ups, pipeline chart)
          gets built next, once the foundation below is confirmed working.
        </p>
      </div>
    </div>
  );
}
