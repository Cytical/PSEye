import { unstable_cache } from "next/cache";
import { createDb, getHistoricalQuotes as getHistoricalQuotesQuery } from "@pseye/db";
import { MockHistoricalQuoteSource, type HistoricalClose, type Quote } from "@pseye/source-quotes";

export interface HistoricalQuotesResult {
  /** Whether `history` is real DB-backed data or the MockHistoricalQuoteSource fallback — lets
   * callers (the DCA calculator) show a "sample data" caveat only when it's actually true. */
  source: "real" | "mock";
  history: Record<string, HistoricalClose[]>;
}

/**
 * Raw DB read, cached: /stocks/[ticker] alone calls this once per company
 * (282 generateStaticParams pages, a year-deep window each) and
 * marketStats/marketAnalytics/marketUniverse each call it again for their
 * own large-cap subset — every one of those was, uncached, a fresh Neon
 * round-trip on every build/revalidate, and a year of OHLC per ticker is
 * heavier than any of the whole-table reads unstable_cache already covers in
 * quotes.ts/companyProfiles.ts. Same 3600s window (matches the hourly quotes
 * ETL) so repeat builds within that window hit Next's Data Cache — which
 * persists across Vercel deployments — instead of Neon.
 */
const fetchHistoricalQuotesRows = unstable_cache(
  async (tickers: string[], fromDate: string): Promise<Record<string, HistoricalClose[]> | null> => {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) return null;
    try {
      const db = createDb(databaseUrl);
      const rows = await getHistoricalQuotesQuery(db, tickers, fromDate);
      const byTicker: Record<string, HistoricalClose[]> = {};
      for (const r of rows) {
        (byTicker[r.ticker] ??= []).push({ date: r.tradeDate, close: Number(r.close) });
      }
      return byTicker;
    } catch (err) {
      console.error("fetchHistoricalQuotesRows: DB read failed, falling back to mock data", err);
      return null;
    }
  },
  ["historical-quotes"],
  { revalidate: 3600, tags: ["historical-quotes"] }
);

/**
 * DB-backed when DATABASE_URL is configured and the daily ETL job
 * (etl/jobs/fetch-historical-quotes.ts, PseEdgeHistoricalQuoteSource) has
 * populated it, otherwise MockHistoricalQuoteSource per ticker. Falls back
 * for ALL requested tickers together (not per-ticker) if even one is
 * missing from the DB — mixing a real close series with a fake random walk
 * inside the same composite/DCA calculation would be misleading, so a
 * partially-backfilled table degrades to fully-mock rather than fully-mixed.
 *
 * Called from apps/web/app/api/history/route.ts (the DCA calculator's client
 * fetch target) and directly from server components like
 * apps/web/app/stocks/[ticker]/page.tsx — never from client code, since this
 * (like every *Source here) does real HTTP/DB work that has no place
 * running in a visitor's browser.
 *
 * `getCurrentQuotes` is a lazy loader, not a plain `Quote[]`, so the (already
 * DB-backed) daily-quotes read it anchors the mock fallback to only actually
 * runs when that fallback is taken — the common case, once the DB is
 * populated, is every requested ticker resolving from historical_quotes
 * directly, which needs no quotes at all.
 */
export async function getHistoricalQuotes(
  tickers: string[],
  fromDate: string,
  getCurrentQuotes: () => Promise<Quote[]>
): Promise<HistoricalQuotesResult> {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    const byTicker = await fetchHistoricalQuotesRows(tickers, fromDate);
    if (byTicker && tickers.every((t) => byTicker[t]?.length)) {
      return { source: "real", history: byTicker };
    }
  }

  const mockSource = new MockHistoricalQuoteSource(await getCurrentQuotes());
  const entries = await Promise.all(
    tickers.map(async (t) => [t, await mockSource.getHistory(t, fromDate)] as const)
  );
  return { source: "mock", history: Object.fromEntries(entries) };
}

/**
 * Like getHistoricalQuotes, but for callers that compute each ticker
 * INDEPENDENTLY (per-stock volatility, beta, pairwise correlation on
 * /analytics) rather than blending series into one composite. Returns whatever
 * real DB-backed series exist, silently dropping tickers with no history —
 * there's no all-or-nothing mock gate here because a thin/missing ticker just
 * gets excluded from the analysis rather than corrupting a shared average, and
 * unlike the DCA calculator there's no meaningful synthetic fallback (random-
 * walk betas/correlations would be noise dressed as insight), so a DB with no
 * data at all yields `source: "mock"` with an empty history and the page shows
 * an honest empty state instead of fabricated numbers.
 */
export async function getHistoricalQuotesLenient(
  tickers: string[],
  fromDate: string
): Promise<HistoricalQuotesResult> {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    const byTicker = await fetchHistoricalQuotesRows(tickers, fromDate);
    if (byTicker && Object.keys(byTicker).length > 0) {
      return { source: "real", history: byTicker };
    }
  }
  return { source: "mock", history: {} };
}
