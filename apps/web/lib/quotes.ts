import { createDb, getLatestDailyQuotes } from "@pseye/db";
import { MockQuoteSource, type PseSector, type Quote } from "@pseye/source-quotes";

/**
 * DB-backed when DATABASE_URL is configured and the ETL job has populated it,
 * otherwise MockQuoteSource. Falls back to mock on any DB error too, so a
 * misconfigured or not-yet-migrated database never breaks the page — same
 * "swap source without a rewrite" contract as every other *Source in this repo.
 */
export async function getDailyQuotes(): Promise<Quote[]> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return new MockQuoteSource().getDailyQuotes();

  try {
    const db = createDb(databaseUrl);
    const rows = await getLatestDailyQuotes(db);
    if (rows.length === 0) return new MockQuoteSource().getDailyQuotes();

    return rows.map((r) => ({
      ticker: r.ticker,
      companyName: r.companyName,
      sector: r.sector as PseSector,
      price: r.price == null ? null : Number(r.price),
      pctChange: r.pctChange == null ? null : Number(r.pctChange),
      marketCap: r.marketCap == null ? 0 : Number(r.marketCap),
    }));
  } catch (err) {
    console.error("getDailyQuotes: DB read failed, falling back to mock data", err);
    return new MockQuoteSource().getDailyQuotes();
  }
}
