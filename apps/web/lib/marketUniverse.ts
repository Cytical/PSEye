import type { HistoricalClose, Quote } from "@pseye/source-quotes";
import { getDailyQuotes } from "./quotes";
import { getHistoricalQuotesLenient } from "./historicalQuotes";
import { datedReturns, weightedIndexReturns } from "./marketBenchmark";
import { byInvestableCapDesc, investableMarketCap } from "./floatAdjustedCap";

/**
 * Shared loader for the "large-cap universe + reconstructed cap-weighted
 * benchmark" that the market-level features (clustering, and reusable by the
 * analytics/market-stats pages) all start from: fetch the top-N stocks by
 * market cap, read their real daily closes, drop the ones too thin to analyze,
 * and build the PSEye Composite benchmark return series from what's left.
 *
 * One multi-ticker history read + pure math. Returns `source: "mock"` with an
 * empty universe when no real history is available, so callers show an honest
 * empty state instead of clustering placeholder data.
 */

export interface LoadedUniverse {
  source: "real" | "mock";
  /** All tracked quotes (every stock), for market-wide context. */
  quotes: Quote[];
  /** The top-N-by-market-cap subset that had enough real history to analyze. */
  universe: Quote[];
  history: Record<string, HistoricalClose[]>;
  /** Reconstructed cap-weighted benchmark: date → weighted-average daily return. */
  benchmark: Map<string, number>;
  /** Most recent close date across the universe. */
  asOf: string | null;
}

export async function loadUniverse({
  size = 100,
  minCloses = 60,
  lookbackDays = 400,
}: { size?: number; minCloses?: number; lookbackDays?: number } = {}): Promise<LoadedUniverse> {
  const quotes = await getDailyQuotes();
  // investableMarketCap for both the top-N cut and the weights below: market
  // cap for almost every ticker, float-adjusted only for the two names (MFC,
  // SLF) whose shares mostly don't trade on this exchange, so a benchmark
  // weighted on their raw cap wouldn't be tracking this market. See
  // lib/floatAdjustedCap.ts.
  const ranked = [...quotes].sort(byInvestableCapDesc).slice(0, size);

  const from = new Date();
  from.setUTCDate(from.getUTCDate() - lookbackDays);
  const fromIso = from.toISOString().slice(0, 10);

  const { source, history } = await getHistoricalQuotesLenient(
    ranked.map((q) => q.ticker),
    fromIso
  );

  const universe = ranked.filter((q) => (history[q.ticker]?.length ?? 0) >= minCloses);
  if (source !== "real" || universe.length < 5) {
    return { source: "mock", quotes, universe: [], history: {}, benchmark: new Map(), asOf: null };
  }

  const benchmark = weightedIndexReturns(
    universe.map((q) => ({ returns: datedReturns(history[q.ticker]), weight: investableMarketCap(q) }))
  );

  const allDates = universe.flatMap((q) => history[q.ticker].map((c) => c.date));
  const asOf = allDates.length ? allDates.reduce((a, b) => (a > b ? a : b)) : null;

  return { source: "real", quotes, universe, history, benchmark, asOf };
}
