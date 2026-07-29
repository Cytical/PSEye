import { unstable_cache } from "next/cache";
import { createDb, getLatestMarketSnapshot as getLatestMarketSnapshotQuery } from "@pseye/db";

export interface MarketSnapshot {
  pseiValue: number;
  pseiChange: number;
  pseiPctChange: number;
  /** ISO timestamp of when this reading was captured. */
  capturedAt: string;
}

/** Sample data so the summary bar renders end-to-end without a database — same fallback contract as getDailyQuotes. */
const SAMPLE_SNAPSHOT: MarketSnapshot = {
  pseiValue: 6325.15,
  pseiChange: 22.65,
  pseiPctChange: 0.36,
  capturedAt: new Date().toISOString(),
};

/**
 * DB-backed when DATABASE_URL is configured and the hourly ETL job
 * (etl/jobs/fetch-market-snapshot.ts) has populated it, otherwise sample data.
 * Falls back on any DB error too — same "never break the page" contract as
 * apps/web/lib/quotes.ts's getDailyQuotes.
 *
 * Wrapped in unstable_cache for the same reason as getDailyQuotes: SiteFooter
 * now calls this on every route (for its own "last updated" line) on top of
 * the homepage's existing call — without a shared cache that's two whole-table
 * reads per page view sitewide instead of one. Same 3600s window, matching
 * the hourly market-snapshot ETL cadence.
 */
export const getMarketSnapshot = unstable_cache(fetchMarketSnapshot, ["market-snapshot"], {
  revalidate: 3600,
  tags: ["market-snapshot"],
});

async function fetchMarketSnapshot(): Promise<MarketSnapshot> {
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
      capturedAt: row.capturedAt.toISOString(),
    };
  } catch (err) {
    console.error("getMarketSnapshot: DB read failed, falling back to sample data", err);
    return SAMPLE_SNAPSHOT;
  }
}
