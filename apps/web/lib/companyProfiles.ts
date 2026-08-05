import { unstable_cache } from "next/cache";
import { createDb, getCompanyProfiles as getCompanyProfilesQuery, type CompanyPersonRow } from "@pseye/db";

export type { CompanyPersonRow };

export interface CompanyProfile {
  description: string;
  /** e.g. "Company profile — SEC Form 17-A (2024)". */
  source: string;
  /** Everything below is best-effort — see the company_profiles schema
   * doc comment for where each comes from. Absent, not fabricated, when
   * unavailable. */
  businessAddress: string | null;
  website: string | null;
  incorporationDate: string | null;
  numberOfDirectors: number | null;
  externalAuditor: string | null;
  fiscalYearEnd: string | null;
  /** Self-contained `data:image/webp;base64,...` URI — see the
   * company_profiles schema doc comment on logoImage. */
  logoImage: string | null;
  boardOfDirectors: CompanyPersonRow[];
  managementOfficers: CompanyPersonRow[];
  wikipediaTitle: string | null;
  wikipediaSummary: string | null;
  wikipediaUrl: string | null;
}

/**
 * Ticker -> one-time-fetched company description, populated by the manual
 * backfill in etl/jobs/backfill-company-profiles.ts (not a recurring ETL job
 * — see that file's doc comment). Same "swap source without touching
 * callers" / fallback-to-empty contract as getDailyQuotes: falls back to {}
 * (no description shown, not a fabricated one) rather than breaking the page
 * on a missing or misconfigured DB.
 *
 * Wrapped in unstable_cache: same whole-table-read-fanned-out-across-282-
 * ticker-pages problem as getDailyQuotes (see quotes.ts), except this table's
 * `description`/`wikipediaSummary` text columns make each uncached read the
 * heaviest of the bunch — this is the single biggest lever on Neon egress.
 */
export const getCompanyProfiles = unstable_cache(fetchCompanyProfiles, ["company-profiles"], {
  revalidate: 3600,
  tags: ["company-profiles"],
});

async function fetchCompanyProfiles(): Promise<Record<string, CompanyProfile>> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return {};

  try {
    const db = createDb(databaseUrl);
    const rows = await getCompanyProfilesQuery(db);

    const byTicker: Record<string, CompanyProfile> = {};
    for (const row of rows) {
      byTicker[row.ticker] = {
        description: row.description,
        source: row.source,
        businessAddress: row.businessAddress,
        website: row.website,
        incorporationDate: row.incorporationDate,
        numberOfDirectors: row.numberOfDirectors,
        externalAuditor: row.externalAuditor,
        fiscalYearEnd: row.fiscalYearEnd,
        logoImage: row.logoImage,
        boardOfDirectors: row.boardOfDirectors,
        managementOfficers: row.managementOfficers,
        wikipediaTitle: row.wikipediaTitle,
        wikipediaSummary: row.wikipediaSummary,
        wikipediaUrl: row.wikipediaUrl,
      };
    }
    return byTicker;
  } catch (err) {
    console.error("getCompanyProfiles: DB read failed, falling back to no company profiles", err);
    return {};
  }
}
