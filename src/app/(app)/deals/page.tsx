import { eq, asc } from "drizzle-orm";
import { db } from "@/db";
import { dealStages, opportunities, companies, contacts, fieldDefinitions } from "@/db/schema";
import { user as userTable } from "@/db/auth-schema";
import { getCurrentUser, hasPermission } from "@/lib/current-user";
import { AccessDeniedError } from "@/lib/require-permission";
import type { IFieldDefinition } from "@/lib/custom-fields";
import DealsBoard from "./DealsBoard";

export default async function DealsPage() {
  const user = await getCurrentUser();
  if (!user || !(hasPermission(user, "opportunities.view_own") || hasPermission(user, "opportunities.view_all"))) {
    throw new AccessDeniedError();
  }

  const stages = await db.select().from(dealStages).orderBy(asc(dealStages.sortOrder));

  const allDeals = hasPermission(user, "opportunities.view_all")
    ? await db.select().from(opportunities)
    : await db.select().from(opportunities).where(eq(opportunities.ownerId, user.id));

  const [allCompanies, allContacts, allUsers, customFieldDefs] = await Promise.all([
    db.select().from(companies).where(eq(companies.active, true)),
    db.select().from(contacts).where(eq(contacts.active, true)),
    db.select({ id: userTable.id, name: userTable.name }).from(userTable),
    db.select().from(fieldDefinitions).where(eq(fieldDefinitions.entityType, "opportunity")),
  ]);
  const opportunityFieldDefs = customFieldDefs as unknown as IFieldDefinition[];

  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Deals</h1>
      </div>
      <DealsBoard
        currentUser={{ id: user.id, name: user.name }}
        canCreate={hasPermission(user, "opportunities.create")}
        canCreateForOthers={hasPermission(user, "opportunities.create_for_others")}
        canEdit={hasPermission(user, "opportunities.edit")}
        canClose={hasPermission(user, "opportunities.close")}
        canDelete={hasPermission(user, "opportunities.delete")}
        stages={stages}
        deals={allDeals}
        companies={allCompanies}
        contacts={allContacts}
        users={allUsers}
        customFieldDefs={opportunityFieldDefs}
      />
    </div>
  );
}
