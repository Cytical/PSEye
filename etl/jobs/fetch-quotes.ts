import "../lib/loadEnv";
import { sql } from "drizzle-orm";
import { createDb, dailyQuotes } from "@pseye/db";
import { PseEdgeQuoteSource } from "@pseye/source-quotes";
import { triggerRevalidate } from "../lib/triggerRevalidate";

/**
 * Runs hourly during PSE trading hours as a step in
 * .github/workflows/market-data-hourly.yml (:16 past 01-08 UTC / 9:16am-4:16pm
 * PHT weekdays — merged 2026-07-26 with fetch-market-snapshot into one job,
 * previously its own quotes-hourly.yml at :17) and scrapes PSE Edge's public
 * per-company pages — see PseEdgeQuoteSource's doc comment for the
 * caching/rate-limit reasoning and docs/PLANNING.md for the legal tradeoffs
 * behind that choice (Open Question #1). The board refreshes through the day;
 * the post-close 4:16pm run captures each ticker's FINAL close.
 *
 * Hourly is the balance point. This used to run every 15 min for near-live
 * prices, but GitHub silently drops high-frequency scheduled runs (this
 * workflow, on a 15-min schedule, produced multi-day gaps with zero runs —
 * confirmed live); reliable 15-min polling would need an external trigger
 * (Vercel Cron/cron-job.org -> workflow_dispatch), not worth it on a free
 * Vercel plan. Once-daily was reliable but lost all intraday freshness. ~8
 * runs/day is low enough that GitHub honors it yet still updates through the
 * session. GitHub Actions minutes aren't a constraint (public repo,
 * free/uncapped) and Neon compute has ample headroom at this cadence.
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
      freeFloatPct: quote.freeFloatPct == null ? null : quote.freeFloatPct.toString(),
      volume: quote.volume ?? null,
      value: quote.value == null ? null : quote.value.toString(),
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
          freeFloatPct: sql`excluded.free_float_pct`,
          volume: sql`excluded.volume`,
          value: sql`excluded.value`,
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

  if (rows.length > 0) {
    // Also covers market-snapshot: this step runs second in
    // market-data-hourly.yml (after fetch-market-snapshot), so one combined
    // call here catches both of that job's writes. Only the static
    // list/dashboard pages are listed — not /stocks/[ticker] or
    // /sectors/[sector] (282 and ~7 dynamic paths respectively): a
    // revalidatePath per path there would itself add writes back, working
    // against the point of this call. Those stay on their own wall-clock
    // window.
    await triggerRevalidate(
      ["daily-quotes", "market-snapshot"],
      [
        "/",
        "/stocks",
        "/rankings",
        "/screener",
        "/sectors",
        "/most-active",
        "/portfolio",
        "/compare",
        "/market-stats",
        "/analytics",
        "/clusters",
        "/regime",
        "/dividends",
      ]
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
