import { createDb, getCompanyProfiles as getCompanyProfilesQuery } from "@pseye/db";

export interface CompanyProfile {
  description: string;
  /** e.g. "PSE Edge company profile — SEC Form 17-A (2024)". */
  source: string;
}

/**
 * Ticker -> one-time-fetched company description, populated by the manual
 * backfill in etl/jobs/backfill-company-profiles.ts (not a recurring ETL job
 * — see that file's doc comment). Same "swap source without touching
 * callers" / fallback-to-empty contract as getDailyQuotes: falls back to {}
 * (no description shown, not a fabricated one) rather than breaking the page
 * on a missing or misconfigured DB.
 */
export async function getCompanyProfiles(): Promise<Record<string, CompanyProfile>> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return {};

  try {
    const db = createDb(databaseUrl);
    const rows = await getCompanyProfilesQuery(db);

    const byTicker: Record<string, CompanyProfile> = {};
    for (const row of rows) {
      byTicker[row.ticker] = { description: row.description, source: row.source };
    }
    return byTicker;
  } catch (err) {
    console.error("getCompanyProfiles: DB read failed, falling back to no company profiles", err);
    return {};
  }
}
