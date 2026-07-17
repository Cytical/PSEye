import { createDb, getUpcomingCorporateActions as getUpcomingCorporateActionsQuery } from "@pseye/db";
import {
  MockCorporateActionSource,
  type CorporateAction,
  type CorporateActionType,
} from "@pseye/source-corporate-actions";

/**
 * DB-backed when DATABASE_URL is configured and the daily ETL job
 * (etl/jobs/fetch-corporate-actions.ts, PseEdgeCorporateActionSource) has
 * populated it, otherwise MockCorporateActionSource. Falls back on any DB
 * error too — same contract as getDailyQuotes.
 */
export async function getCorporateActions(): Promise<CorporateAction[]> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return new MockCorporateActionSource().getUpcoming();

  try {
    const db = createDb(databaseUrl);
    const rows = await getUpcomingCorporateActionsQuery(db);
    if (rows.length === 0) return new MockCorporateActionSource().getUpcoming();

    return rows.map((r) => ({
      ticker: r.ticker,
      companyName: r.companyName,
      type: r.type as CorporateActionType,
      exDate: r.exDate,
      recordDate: r.recordDate,
      paymentDate: r.paymentDate,
      details: r.details,
    }));
  } catch (err) {
    console.error("getCorporateActions: DB read failed, falling back to mock data", err);
    return new MockCorporateActionSource().getUpcoming();
  }
}
