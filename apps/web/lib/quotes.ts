import { unstable_cache } from "next/cache";
import { createDb, getLatestDailyQuotes } from "@pseye/db";
import { MockQuoteSource, type PseSector, type Quote } from "@pseye/source-quotes";

/**
 * DB-backed when DATABASE_URL is configured and the ETL job has populated it,
 * otherwise MockQuoteSource. Falls back to mock on any DB error too, so a
 * misconfigured or not-yet-migrated database never breaks the page — same
 * "swap source without a rewrite" contract as every other *Source in this repo.
 *
 * Wrapped in unstable_cache: this is a no-args, whole-table read called from
 * ~11 call sites including /stocks/[ticker]'s page AND opengraph-image (282
 * companies each) — without a shared cache, one `next build` reissues this
 * same query 500+ times against Neon, which is real egress against the free
 * tier's 5GB/month transfer cap. The 3600s window matches the hourly quotes
 * ETL cadence every caller already assumes.
 */
export const getDailyQuotes = unstable_cache(fetchDailyQuotes, ["daily-quotes"], {
  revalidate: 3600,
  tags: ["daily-quotes"],
});

async function fetchDailyQuotes(): Promise<Quote[]> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return new MockQuoteSource().getDailyQuotes();

  try {
    const db = createDb(databaseUrl);
    const rows = await getLatestDailyQuotes(db);
    if (rows.length === 0) {
      // Loud on purpose. A DATABASE_URL pointing at the *wrong* Postgres is
      // still a reachable one, so nothing throws and the site just quietly
      // renders mock prices — indistinguishable from real data at a glance.
      // This is the canary for that; see next.config.ts for the cause it
      // caught. getDailyQuotes is the right place for it: every page depends
      // on quotes, so one warning here covers the whole site without adding
      // the same log to all nineteen lib/*.ts readers.
      // ASCII only: this is read in a Windows console that renders the repo's
      // usual em dash as mojibake.
      console.warn(
        `getDailyQuotes: DATABASE_URL is set (${dbHost(databaseUrl)}) but daily_quotes is empty - ` +
          `serving mock data. Check that it points at the populated database and that fetch-quotes has run.`,
      );
      return new MockQuoteSource().getDailyQuotes();
    }

    return rows.map((r) => ({
      ticker: r.ticker,
      companyName: r.companyName,
      sector: r.sector as PseSector,
      price: r.price == null ? null : Number(r.price),
      pctChange: r.pctChange == null ? null : Number(r.pctChange),
      marketCap: r.marketCap == null ? 0 : Number(r.marketCap),
      freeFloatPct: r.freeFloatPct == null ? null : Number(r.freeFloatPct),
      volume: r.volume == null ? null : Number(r.volume),
      value: r.value == null ? null : Number(r.value),
    }));
  } catch (err) {
    console.error("getDailyQuotes: DB read failed, falling back to mock data", err);
    return new MockQuoteSource().getDailyQuotes();
  }
}

/** Host only, so a connection string never lands in a log or CI transcript. */
function dbHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "unparseable URL";
  }
}
