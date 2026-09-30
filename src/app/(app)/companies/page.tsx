import { eq } from "drizzle-orm";
import { db } from "@/db";
import { companies, contacts, fieldDefinitions } from "@/db/schema";
import { requirePermission, AccessDeniedError } from "@/lib/require-permission";
import CompaniesClient from "./CompaniesClient";

export default async function CompaniesPage() {
  let canEdit = false;
  try {
    await requirePermission("companies.view");
    canEdit = await requirePermission("companies.edit").then(() => true).catch(() => false);
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return <div className="error-banner">{err.message}</div>;
    }
    throw err;
  }

  const [allCompanies, allContacts, companyFields, contactFields] = await Promise.all([
    db.select().from(companies).orderBy(companies.name),
    db.select().from(contacts).orderBy(contacts.name),
    db.select().from(fieldDefinitions).where(eq(fieldDefinitions.entityType, "company")).orderBy(fieldDefinitions.sortOrder),
    db.select().from(fieldDefinitions).where(eq(fieldDefinitions.entityType, "contact")).orderBy(fieldDefinitions.sortOrder)
  ]);

  return (
    <CompaniesClient
      companies={allCompanies}
      contacts={allContacts}
      companyFields={companyFields as any}
      contactFields={contactFields as any}
      canEdit={canEdit}
    />
  );
}
