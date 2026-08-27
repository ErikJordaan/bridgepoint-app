import { db } from "@/db";
import { fieldDefinitions } from "@/db/schema";
import { requirePermission, AccessDeniedError } from "@/lib/require-permission";
import FieldsClient from "./FieldsClient";

export default async function FieldsPage() {
  try {
    await requirePermission("admin.manage_fields");
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return <div className="error-banner">{err.message}</div>;
    }
    throw err;
  }

  const fields = await db.select().from(fieldDefinitions).orderBy(fieldDefinitions.entityType, fieldDefinitions.sortOrder);

  return <FieldsClient fields={fields} />;
}
