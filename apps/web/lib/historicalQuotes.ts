import { createDb, getHistoricalQuotes as getHistoricalQuotesQuery } from "@pseye/db";
import { MockHistoricalQuoteSource, type HistoricalClose, type Quote } from "@pseye/source-quotes";

/**
 * DB-backed when DATABASE_URL is configured and the daily ETL job
 * (etl/jobs/fetch-historical-quotes.ts, PseEdgeHistoricalQuoteSource) has
 * populated it, otherwise MockHistoricalQuoteSource per ticker. Falls back
 * for ALL requested tickers together (not per-ticker) if even one is
 * missing from the DB — mixing a real close series with a fake random walk
 * inside the same composite/DCA calculation would be misleading, so a
 * partially-backfilled table degrades to fully-mock rather than fully-mixed.
 *
 * Called only from apps/web/app/api/history/route.ts — never directly from
 * client code, since this (like every *Source here) does real HTTP/DB work
 * that has no place running in a visitor's browser.
 */
export async function getHistoricalQuotes(
  tickers: string[],
  fromDate: string,
  currentQuotes: Quote[]
): Promise<Record<string, HistoricalClose[]>> {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    try {
      const db = createDb(databaseUrl);
      const rows = await getHistoricalQuotesQuery(db, tickers, fromDate);
      const byTicker: Record<string, HistoricalClose[]> = {};
      for (const r of rows) {
        (byTicker[r.ticker] ??= []).push({ date: r.tradeDate, close: Number(r.close) });
      }
      if (tickers.every((t) => byTicker[t]?.length)) return byTicker;
    } catch (err) {
      console.error("getHistoricalQuotes: DB read failed, falling back to mock data", err);
    }
  }

  const mockSource = new MockHistoricalQuoteSource(currentQuotes);
  const entries = await Promise.all(
    tickers.map(async (t) => [t, await mockSource.getHistory(t, fromDate)] as const)
  );
  return Object.fromEntries(entries);
}
