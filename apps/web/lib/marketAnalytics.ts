import type { Quote } from "@pseye/source-quotes";
import { getDailyQuotes } from "./quotes";
import { getHistoricalQuotesLenient } from "./historicalQuotes";
import { annualizedVolatility, beta, correlation, rsi, trailingReturn } from "./analytics";
import { alignByDate, datedReturns, weightedIndexReturns, type DatedReturn } from "./marketBenchmark";
import { byInvestableCapDesc, investableMarketCap } from "./floatAdjustedCap";

/**
 * Server-only. Computes the /analytics page's two cross-sectional views from
 * ~1 year of real daily closes:
 *
 *  1. A per-stock leaderboard (volatility, beta vs a reconstructed benchmark,
 *     1-year return, RSI) for the largest tickers by market cap.
 *  2. A sector × sector correlation matrix of daily returns.
 *
 * The benchmark ("PSEye Composite") is reconstructed from constituents' own
 * closes, market-cap-weighted using current caps as a shares-≈-constant proxy
 * (we don't store historical share counts). It is NOT the official float-
 * adjusted PSEi — labeled as such on the page. This is the same "recompute the
 * asset ourselves rather than re-host PSE's numbers" posture the treemap and
 * foreign-flow features take.
 *
 * One multi-ticker DB read for the whole set (getHistoricalQuotesLenient),
 * then pure math — cheap enough for an hourly-revalidated ISR page.
 */

const LOOKBACK_DAYS = 400; // ~1 trading year plus slack for the 251-day trailing return
const LEADERBOARD_SIZE = 40; // largest N by market cap that have real history

export interface AnalyticsRow {
  ticker: string;
  companyName: string;
  sector: string;
  price: number | null;
  pctChange: number | null;
  marketCap: number;
  volatility: number | null;
  beta: number | null;
  return1y: number | null;
  rsi: number | null;
}

export interface SectorCorrelation {
  sectors: string[];
  /** matrix[i][j] = Pearson correlation of sector i's and sector j's daily returns; null when undefined. */
  matrix: (number | null)[][];
}

export interface MarketAnalytics {
  source: "real" | "mock";
  asOf: string | null;
  benchmarkTickerCount: number;
  rows: AnalyticsRow[];
  sectorCorrelation: SectorCorrelation | null;
}

export async function getMarketAnalytics(): Promise<MarketAnalytics> {
  const quotes = await getDailyQuotes();

  // Largest tickers by market cap — the benchmark constituents and the
  // leaderboard rows. Requesting a superset (we filter to those with real
  // history after the read) keeps the leaderboard full even if a few of the
  // very top names have thin series.
  // investableMarketCap (see lib/floatAdjustedCap.ts) for both the leaderboard
  // cut and the benchmark's weights below — market cap for almost every
  // ticker, float-adjusted only for MFC/SLF.
  const ranked = [...quotes].sort(byInvestableCapDesc);
  const candidates = ranked.slice(0, LEADERBOARD_SIZE + 20);

  const fromDate = isoDaysAgo(LOOKBACK_DAYS);
  const { source, history } = await getHistoricalQuotesLenient(
    candidates.map((q) => q.ticker),
    fromDate
  );

  const withHistory = candidates.filter((q) => (history[q.ticker]?.length ?? 0) >= 30);
  if (source !== "real" || withHistory.length < 2) {
    return { source: "mock", asOf: null, benchmarkTickerCount: 0, rows: [], sectorCorrelation: null };
  }

  // Cap-weighted benchmark return series from the constituents' own closes.
  const benchmark = weightedIndexReturns(
    withHistory.map((q) => ({ returns: datedReturns(history[q.ticker]), weight: investableMarketCap(q) }))
  );

  const rows: AnalyticsRow[] = withHistory
    .slice(0, LEADERBOARD_SIZE)
    .map((q) => {
      const closes = history[q.ticker].map((c) => c.close);
      const stockReturns = new Map(datedReturns(history[q.ticker]).map((r) => [r.date, r.ret]));
      const aligned = alignByDate(stockReturns, benchmark);
      return {
        ticker: q.ticker,
        companyName: q.companyName,
        sector: q.sector,
        price: q.price,
        pctChange: q.pctChange,
        marketCap: q.marketCap,
        volatility: annualizedVolatility(closes),
        beta: beta(aligned.a, aligned.b),
        return1y: trailingReturn(closes, 251),
        rsi: rsi(closes),
      };
    });

  // Sector correlation: an equal-weighted return series per sector, then
  // pairwise Pearson correlation. Uses ALL constituents with history grouped
  // by sector (not just the leaderboard's top 40 rows) for a fuller signal.
  const bySector = new Map<string, DatedReturn[][]>();
  for (const q of withHistory) {
    // SME Board excluded for now — see sectorSlug.ts's VISIBLE_SECTORS for why.
    if (q.sector === "SME Board") continue;
    let series = bySector.get(q.sector);
    if (!series) {
      series = [];
      bySector.set(q.sector, series);
    }
    series.push(datedReturns(history[q.ticker]));
  }
  const sectorSeries = [...bySector.entries()]
    .filter(([, series]) => series.length >= 1)
    .map(([sector, series]) => ({
      sector,
      returns: weightedIndexReturns(series.map((returns) => ({ returns, weight: 1 }))),
    }))
    .sort((a, b) => a.sector.localeCompare(b.sector));

  let sectorCorrelation: SectorCorrelation | null = null;
  if (sectorSeries.length >= 2) {
    const sectors = sectorSeries.map((s) => s.sector);
    const matrix = sectorSeries.map((rowSec) =>
      sectorSeries.map((colSec) => {
        if (rowSec.sector === colSec.sector) return 1;
        const aligned = alignByDate(rowSec.returns, colSec.returns);
        return correlation(aligned.a, aligned.b);
      })
    );
    sectorCorrelation = { sectors, matrix };
  }

  const allDates = withHistory.flatMap((q) => history[q.ticker].map((c) => c.date));
  const asOf = allDates.length ? allDates.reduce((a, b) => (a > b ? a : b)) : null;

  return {
    source: "real",
    asOf,
    benchmarkTickerCount: withHistory.length,
    rows,
    sectorCorrelation,
  };
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}

// Re-export so the page can render "N/A" consistently for a null quote price.
export type { Quote };
