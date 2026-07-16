import { createDb, getLatestIndexForeignFlow as getLatestIndexForeignFlowQuery } from "@pseye/db";
import { MockForeignFlowSource } from "@pseye/source-foreign-flow";

export interface LatestForeignFlow {
  /** YYYY-MM-DD, the Friday/month-end the period covers through — this is weekly data, never a true daily figure. */
  periodEnd: string;
  netValue: number;
}

/**
 * DB-backed when DATABASE_URL is configured and the weekly ETL job
 * (etl/jobs/fetch-foreign-flow.ts) has populated it, otherwise MockForeignFlowSource's
 * latest period. Falls back on any DB error too — same contract as getDailyQuotes.
 *
 * Deliberately weekly, not daily: PSE only publishes index-level foreign
 * buying/selling in its weekly Market Watch PDF (see docs/PLANNING.md Open
 * Question #1 and packages/sources/foreign-flow's doc comments) — true daily
 * foreign flow needs a licensed feed, so this reports the latest available
 * week rather than fabricating a daily number.
 */
export async function getLatestForeignFlow(): Promise<LatestForeignFlow> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return fromMock();

  try {
    const db = createDb(databaseUrl);
    const row = await getLatestIndexForeignFlowQuery(db);
    if (!row) return fromMock();

    return { periodEnd: row.periodEnd, netValue: row.netValue };
  } catch (err) {
    console.error("getLatestForeignFlow: DB read failed, falling back to mock data", err);
    return fromMock();
  }
}

async function fromMock(): Promise<LatestForeignFlow> {
  const periods = await new MockForeignFlowSource().getIndexFlow();
  const latest = periods[periods.length - 1];
  return { periodEnd: latest.periodEnd, netValue: latest.netValue };
}
