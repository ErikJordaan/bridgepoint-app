import { db } from "@/db";
import { dealStages } from "@/db/schema";
import { requirePermission, AccessDeniedError } from "@/lib/require-permission";
import StagesClient from "./StagesClient";

export default async function StagesPage() {
  try {
    await requirePermission("admin.manage_stages");
  } catch (err) {
    if (err instanceof AccessDeniedError) {
      return <div className="error-banner">{err.message}</div>;
    }
    throw err;
  }

  const stages = await db.select().from(dealStages).orderBy(dealStages.sortOrder);

  return <StagesClient stages={stages} />;
}
