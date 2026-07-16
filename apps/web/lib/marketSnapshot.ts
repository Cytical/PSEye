import { createDb, getLatestMarketSnapshot as getLatestMarketSnapshotQuery } from "@pseye/db";

export interface MarketSnapshot {
  pseiValue: number;
  pseiChange: number;
  pseiPctChange: number;
  usdPhpRate: number;
  /** ISO timestamp of when this reading was captured. */
  capturedAt: string;
}

/** Sample data so the summary bar renders end-to-end without a database — same fallback contract as getDailyQuotes. */
const SAMPLE_SNAPSHOT: MarketSnapshot = {
  pseiValue: 6325.15,
  pseiChange: 22.65,
  pseiPctChange: 0.36,
  usdPhpRate: 58.7,
  capturedAt: new Date().toISOString(),
};

/**
 * DB-backed when DATABASE_URL is configured and the hourly ETL job
 * (etl/jobs/fetch-market-snapshot.ts) has populated it, otherwise sample data.
 * Falls back on any DB error too — same "never break the page" contract as
 * apps/web/lib/quotes.ts's getDailyQuotes.
 */
export async function getMarketSnapshot(): Promise<MarketSnapshot> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return SAMPLE_SNAPSHOT;

  try {
    const db = createDb(databaseUrl);
    const row = await getLatestMarketSnapshotQuery(db);
    if (!row) return SAMPLE_SNAPSHOT;

    return {
      pseiValue: Number(row.pseiValue),
      pseiChange: Number(row.pseiChange),
      pseiPctChange: Number(row.pseiPctChange),
      usdPhpRate: Number(row.usdPhpRate),
      capturedAt: row.capturedAt.toISOString(),
    };
  } catch (err) {
    console.error("getMarketSnapshot: DB read failed, falling back to sample data", err);
    return SAMPLE_SNAPSHOT;
  }
}
