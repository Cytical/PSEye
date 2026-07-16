import { sql } from "drizzle-orm";
import { createDb, historicalQuotes } from "@pseye/db";
import { PSE_EDGE_COMPANIES, PseEdgeHistoricalQuoteSource } from "@pseye/source-quotes";

/**
 * Runs daily (see .github/workflows/historical-quotes-daily.yml). Backs the
 * DCA calculator's real HistoricalQuoteSource (see apps/web/lib/historicalQuotes.ts
 * and app/api/history/route.ts) instead of MockHistoricalQuoteSource's
 * synthetic price walk.
 *
 * Always re-fetches a fixed multi-year window per ticker (~750 trading days,
 * verified well within what PSE Edge's chart endpoint returns in one request)
 * rather than an incremental "just the last few days" delta — simpler and
 * self-healing if a run is skipped, at the cost of re-transferring data that
 * mostly hasn't changed. Upserts on (ticker, trade_date) so reruns just
 * refresh values, never duplicate rows.
 */
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const db = createDb(databaseUrl);
  const source = new PseEdgeHistoricalQuoteSource();
  const fromDate = yearsAgo(4);

  let upserted = 0;
  for (const company of PSE_EDGE_COMPANIES) {
    const history = await source.getHistory(company.ticker, fromDate);
    if (history.length === 0) {
      console.warn(`No history found for ${company.ticker} (cmpy_id=${company.cmpyId})`);
      continue;
    }

    await db
      .insert(historicalQuotes)
      .values(history.map((h) => ({ ticker: company.ticker, tradeDate: h.date, close: h.close.toString() })))
      .onConflictDoUpdate({
        target: [historicalQuotes.ticker, historicalQuotes.tradeDate],
        set: { close: sql`excluded.close` },
      });
    upserted += history.length;
  }

  console.log(`Upserted ${upserted} historical quote rows across ${PSE_EDGE_COMPANIES.length} companies.`);
}

function yearsAgo(years: number): string {
  const d = new Date();
  d.setUTCFullYear(d.getUTCFullYear() - years);
  return d.toISOString().slice(0, 10);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
