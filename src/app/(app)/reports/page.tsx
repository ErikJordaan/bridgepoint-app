import { eq } from "drizzle-orm";
import { db } from "@/db";
import { opportunities, dealStages } from "@/db/schema";
import { user as userTable } from "@/db/auth-schema";
import { getCurrentUser, hasPermission } from "@/lib/current-user";
import { AccessDeniedError } from "@/lib/require-permission";
import styles from "./reports.module.css";

type RangeKey = "all" | "month" | "quarter" | "year";

function rangeCutoff(range: RangeKey): Date | null {
  const now = new Date();
  if (range === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  if (range === "quarter") {
    const q = Math.floor(now.getMonth() / 3);
    return new Date(now.getFullYear(), q * 3, 1);
  }
  if (range === "year") return new Date(now.getFullYear(), 0, 1);
  return null;
}

function formatCurrency(n: number) {
  return "R " + n.toLocaleString("en-ZA", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

const RANGE_OPTIONS: { key: RangeKey; label: string }[] = [
  { key: "all", label: "All time" },
  { key: "month", label: "This month" },
  { key: "quarter", label: "This quarter" },
  { key: "year", label: "This year" },
];

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user || !(hasPermission(user, "reports.view_own") || hasPermission(user, "reports.view_all"))) {
    throw new AccessDeniedError();
  }

  const canViewAll = hasPermission(user, "reports.view_all");
  const params = await searchParams;
  const range: RangeKey = (["all", "month", "quarter", "year"] as RangeKey[]).includes(params.range as RangeKey)
    ? (params.range as RangeKey)
    : "all";
  const cutoff = rangeCutoff(range);

  const rows = canViewAll
    ? await db
        .select({
          ownerId: opportunities.ownerId,
          isOpen: opportunities.isOpen,
          value: opportunities.value,
          weightedValue: opportunities.weightedValue,
          finalValue: opportunities.finalValue,
          closeDate: opportunities.closeDate,
          isClosedWon: dealStages.isClosedWon,
          isClosedLost: dealStages.isClosedLost,
        })
        .from(opportunities)
        .leftJoin(dealStages, eq(opportunities.stageId, dealStages.id))
    : await db
        .select({
          ownerId: opportunities.ownerId,
          isOpen: opportunities.isOpen,
          value: opportunities.value,
          weightedValue: opportunities.weightedValue,
          finalValue: opportunities.finalValue,
          closeDate: opportunities.closeDate,
          isClosedWon: dealStages.isClosedWon,
          isClosedLost: dealStages.isClosedLost,
        })
        .from(opportunities)
        .leftJoin(dealStages, eq(opportunities.stageId, dealStages.id))
        .where(eq(opportunities.ownerId, user.id));

  const allUsers = await db.select({ id: userTable.id, name: userTable.name }).from(userTable);
  const nameById = new Map(allUsers.map((u) => [u.id, u.name]));

  type Agg = {
    ownerId: string;
    openCount: number;
    openValue: number;
    openWeighted: number;
    wonCount: number;
    wonValue: number;
    lostCount: number;
    lostValue: number;
  };
  const byOwner = new Map<string, Agg>();

  function getAgg(ownerId: string): Agg {
    let a = byOwner.get(ownerId);
    if (!a) {
      a = { ownerId, openCount: 0, openValue: 0, openWeighted: 0, wonCount: 0, wonValue: 0, lostCount: 0, lostValue: 0 };
      byOwner.set(ownerId, a);
    }
    return a;
  }

  for (const row of rows) {
    const a = getAgg(row.ownerId);
    if (row.isOpen) {
      a.openCount += 1;
      a.openValue += Number(row.value || 0);
      a.openWeighted += Number(row.weightedValue || 0);
      continue;
    }
    // Closed deal - apply the date-range filter here (open deals are always a
    // current snapshot, so the range only narrows which closed deals count).
    if (cutoff && row.closeDate && new Date(row.closeDate) < cutoff) continue;

    if (row.isClosedWon) {
      a.wonCount += 1;
      a.wonValue += Number(row.finalValue || 0);
    } else if (row.isClosedLost) {
      a.lostCount += 1;
      a.lostValue += Number(row.finalValue || 0);
    }
  }

  const ownerRows = Array.from(byOwner.values()).sort((a, b) => b.openValue - a.openValue);

  const totals = ownerRows.reduce(
    (acc, r) => {
      acc.openCount += r.openCount;
      acc.openValue += r.openValue;
      acc.openWeighted += r.openWeighted;
      acc.wonCount += r.wonCount;
      acc.wonValue += r.wonValue;
      acc.lostCount += r.lostCount;
      acc.lostValue += r.lostValue;
      return acc;
    },
    { openCount: 0, openValue: 0, openWeighted: 0, wonCount: 0, wonValue: 0, lostCount: 0, lostValue: 0 }
  );

  return (
    <div className={styles.page}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, fontSize: 22 }}>Reports</h1>
      </div>

      <div className={styles.filters}>
        {RANGE_OPTIONS.map((opt) => (
          <a
            key={opt.key}
            href={`/reports?range=${opt.key}`}
            className={opt.key === range ? `${styles.filterLink} ${styles.filterLinkActive}` : styles.filterLink}
          >
            {opt.label}
          </a>
        ))}
      </div>

      <div className={styles.summaryRow}>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Open pipeline</div>
          <div className={styles.summaryValue}>{formatCurrency(totals.openValue)}</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Weighted pipeline</div>
          <div className={styles.summaryValue}>{formatCurrency(totals.openWeighted)}</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Won ({RANGE_OPTIONS.find((r) => r.key === range)?.label})</div>
          <div className={styles.summaryValue}>{formatCurrency(totals.wonValue)}</div>
        </div>
        <div className={styles.summaryCard}>
          <div className={styles.summaryLabel}>Lost ({RANGE_OPTIONS.find((r) => r.key === range)?.label})</div>
          <div className={styles.summaryValue}>{formatCurrency(totals.lostValue)}</div>
        </div>
      </div>

      <div className={styles.tableWrap}>
        {ownerRows.length === 0 ? (
          <div className={styles.emptyState}>No deals to report on yet.</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Salesperson</th>
                <th className={styles.numCell}>Open deals</th>
                <th className={styles.numCell}>Open value</th>
                <th className={styles.numCell}>Weighted value</th>
                <th className={styles.numCell}>Won</th>
                <th className={styles.numCell}>Won value</th>
                <th className={styles.numCell}>Lost</th>
                <th className={styles.numCell}>Lost value</th>
                <th className={styles.numCell}>Win rate</th>
              </tr>
            </thead>
            <tbody>
              {ownerRows.map((r) => {
                const decided = r.wonCount + r.lostCount;
                const winRate = decided > 0 ? Math.round((r.wonCount / decided) * 100) : null;
                return (
                  <tr key={r.ownerId}>
                    <td className={styles.ownerCell}>{nameById.get(r.ownerId) || "Unknown"}</td>
                    <td className={styles.numCell}>{r.openCount}</td>
                    <td className={styles.numCell}>{formatCurrency(r.openValue)}</td>
                    <td className={styles.numCell}>{formatCurrency(r.openWeighted)}</td>
                    <td className={styles.numCell}>{r.wonCount}</td>
                    <td className={styles.numCell}>{formatCurrency(r.wonValue)}</td>
                    <td className={styles.numCell}>{r.lostCount}</td>
                    <td className={styles.numCell}>{formatCurrency(r.lostValue)}</td>
                    <td className={styles.numCell}>
                      {winRate === null ? (
                        "—"
                      ) : (
                        <span className={winRate >= 50 ? styles.winRateGood : styles.winRateBad}>{winRate}%</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
