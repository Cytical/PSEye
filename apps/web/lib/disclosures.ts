import { createDb, getRecentDisclosures as getRecentDisclosuresQuery } from "@pseye/db";
import { MockDisclosureSource, type Disclosure, type DisclosureType } from "@pseye/source-disclosures";

/**
 * DB-backed when DATABASE_URL is configured and the hourly ETL job
 * (etl/jobs/fetch-disclosures.ts, PseEdgeDisclosureSource) has populated it,
 * otherwise MockDisclosureSource. Falls back on any DB error too — same
 * contract as getDailyQuotes.
 */
export async function getDisclosures(): Promise<Disclosure[]> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return new MockDisclosureSource().getRecent();

  try {
    const db = createDb(databaseUrl);
    const rows = await getRecentDisclosuresQuery(db);
    if (rows.length === 0) return new MockDisclosureSource().getRecent();

    return rows.map((r) => ({
      ticker: r.ticker,
      companyName: r.companyName,
      type: r.type as DisclosureType,
      headline: r.headline,
      filedAt: r.filedAt.toISOString(),
      referenceNo: r.referenceNo,
      url: r.url,
    }));
  } catch (err) {
    console.error("getDisclosures: DB read failed, falling back to mock data", err);
    return new MockDisclosureSource().getRecent();
  }
}
