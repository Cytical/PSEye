import "../lib/loadEnv";
import { sql } from "drizzle-orm";
import { createDb, dailyQuotes } from "@pseye/db";
import { PseEdgeQuoteSource } from "@pseye/source-quotes";

/**
 * Runs every 15 min during PSE trading hours (see
 * .github/workflows/quotes-15min.yml) and scrapes PSE Edge's public
 * per-company pages — see PseEdgeQuoteSource's doc comment for the
 * caching/rate-limit reasoning and docs/PLANNING.md for the legal tradeoffs
 * behind that choice (Open Question #1). 15 min matches PSE's own public-data
 * delay floor (pse.com.ph/data-products/) — polling faster wouldn't surface
 * anything the source itself hasn't updated yet. At this cadence, this job
 * plus fetch-market-snapshot.ts together cost roughly 30 CU-hours/month on
 * Neon's free tier (~1,400 combined runs/month, each a cold wake that idles
 * ~5 min at the free tier's fixed 0.25 CU before auto-suspending) — well
 * inside the 100 CU-hour/project/month budget. GitHub Actions minutes aren't
 * a constraint either: this repo is public, so standard-runner minutes are
 * free and uncapped.
 */
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const db = createDb(databaseUrl);
  const source = new PseEdgeQuoteSource();
  const results = await source.getDailyQuotesWithStatus();

  const tradeDate = new Date().toISOString().slice(0, 10);

  // A failed fetch (network error, non-2xx) is not the same as PSE Edge
  // reporting no trade — writing it would overwrite that ticker's real price
  // with a spurious null for the rest of the day. Skip it instead and leave
  // whatever's already stored (this run's fetch failure, not real news).
  const failed = results.filter((r) => r.fetchFailed);
  const usable = results.filter((r) => !r.fetchFailed);

  // Before the day's first (15-min-delayed) trades post, PSE Edge serves a
  // blank "Last Traded Price" for EVERY ticker — only the Previous Close
  // carries a value (see parseStockData). Those all parse to price=null. If we
  // stamped that pre-open/thin-session read with *today's* date, today would
  // become the newest trade_date with no prices at all, and getLatestDailyQuotes
  // would hand the site a board that's N/A across the board — masking
  // yesterday's real closes. (This is exactly the "everything shows N/A" bug.)
  // So only materialize today's snapshot once a real session's worth of tickers
  // have actually traded; until then, leave the last complete trading day in
  // place. Once past the threshold we still write the full board (including the
  // few stragglers as genuine N/A), so no ticker drops off the map.
  const pricedCount = usable.filter((r) => r.quote.price != null).length;
  if (pricedCount < usable.length / 2) {
    console.warn(
      `fetch-quotes: only ${pricedCount}/${usable.length} tickers have a traded price for ${tradeDate} (pre-open / thin session) — skipping write to keep the last complete trading day's closes instead of an all-N/A board.`
    );
    return;
  }

  const rows = usable
    .map(({ quote }) => ({
      ticker: quote.ticker,
      companyName: quote.companyName,
      tradeDate,
      price: quote.price == null ? null : quote.price.toString(),
      pctChange: quote.pctChange == null ? null : quote.pctChange.toString(),
      marketCap: quote.marketCap.toString(),
      sector: quote.sector,
    }));

  if (rows.length > 0) {
    await db
      .insert(dailyQuotes)
      .values(rows)
      .onConflictDoUpdate({
        target: [dailyQuotes.ticker, dailyQuotes.tradeDate],
        set: {
          companyName: sql`excluded.company_name`,
          price: sql`excluded.price`,
          pctChange: sql`excluded.pct_change`,
          marketCap: sql`excluded.market_cap`,
          sector: sql`excluded.sector`,
        },
      });
  }

  console.log(`Upserted ${rows.length} quotes for ${tradeDate}`);
  if (failed.length > 0) {
    console.warn(
      `Skipped ${failed.length} ticker(s) whose fetch failed this run (kept prior data): ${failed.map((f) => f.quote.ticker).join(", ")}`
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
