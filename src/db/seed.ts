// Run with: npm run db:seed
// Creates a sensible starting point - all of this is editable afterward
// through the Admin screens, nothing here is permanent or hardcoded at runtime.

import { config } from "dotenv";
config({ path: ".env.local" });

// Dynamic imports, deliberately - see the comment in migrate.ts for why.
async function main() {
  const { db } = await import("./index");
  const { roles, rolePermissions, dealStages } = await import("./schema");
  const { auth } = await import("@/lib/auth");

  console.log("Seeding roles...");

  const defaultRoles: { name: string; permissions: string[] }[] = [
    {
      name: "Admin",
      permissions: [
        "opportunities.view_own", "opportunities.view_all", "opportunities.create",
        "opportunities.create_for_others", "opportunities.edit", "opportunities.close", "opportunities.delete",
        "companies.view", "companies.edit",
        "reports.view_own", "reports.view_all",
        "admin.manage_users", "admin.manage_roles", "admin.manage_fields", "admin.manage_stages"
      ]
    },
    {
      name: "Back Office",
      permissions: [
        "opportunities.view_own", "opportunities.view_all", "opportunities.create",
        "opportunities.create_for_others", "opportunities.edit",
        "companies.view", "companies.edit",
        "reports.view_own"
      ]
    },
    {
      name: "Operations",
      permissions: [
        "opportunities.view_all",
        "companies.view",
        "reports.view_own"
      ]
    },
    {
      name: "Sales",
      permissions: [
        "opportunities.view_own", "opportunities.create", "opportunities.edit", "opportunities.close",
        "companies.view", "companies.edit",
        "reports.view_own"
      ]
    }
  ];

  for (const r of defaultRoles) {
    const [role] = await db.insert(roles).values({ name: r.name }).onConflictDoNothing().returning();
    const roleId = role?.id ?? (await db.query.roles.findFirst({ where: (t, { eq }) => eq(t.name, r.name) }))!.id;
    for (const key of r.permissions) {
      await db.insert(rolePermissions).values({ roleId, permissionKey: key }).onConflictDoNothing();
    }
  }

  console.log("Seeding deal stages...");
  const defaultStages = [
    { name: "New", probability: 10, sortOrder: 1, isClosedWon: false, isClosedLost: false },
    { name: "Qualifying", probability: 25, sortOrder: 2, isClosedWon: false, isClosedLost: false },
    { name: "Proposal Sent", probability: 50, sortOrder: 3, isClosedWon: false, isClosedLost: false },
    { name: "Negotiation", probability: 75, sortOrder: 4, isClosedWon: false, isClosedLost: false },
    { name: "Closed Won", probability: 100, sortOrder: 5, isClosedWon: true, isClosedLost: false },
    { name: "Closed Lost", probability: 0, sortOrder: 6, isClosedWon: false, isClosedLost: true }
  ];
  for (const s of defaultStages) {
    await db.insert(dealStages).values(s).onConflictDoNothing();
  }

  console.log("Creating initial admin account...");
  const adminEmail = process.env.SEED_ADMIN_EMAIL;
  const adminPassword = process.env.SEED_ADMIN_PASSWORD;
  if (adminEmail && adminPassword) {
    try {
      await auth.api.signUpEmail({
        body: { email: adminEmail, password: adminPassword, name: "Admin", role: "Admin" } as any
      });
      console.log(`Admin account created: ${adminEmail}`);
    } catch (err: any) {
      if (err?.message?.includes("already exist") || err?.message?.includes("USER_ALREADY_EXISTS")) {
        console.log(`Admin account already exists: ${adminEmail} - that's fine, nothing more to do.`);
      } else {
        console.error(`Admin account creation FAILED: ${err?.message || err}`);
      }
    }
  } else {
    console.log("Set SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD in .env.local to auto-create your first admin login.");
  }

  console.log("Done.");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
