import { getDailyQuotes } from "./quotes";
import { getHistoricalQuotesLenient } from "./historicalQuotes";
import {
  annualizedVolatility,
  beta,
  correlation,
  histogram,
  mean,
  percentile,
  sma,
  stdev,
  trailingReturn,
  type HistogramBin,
} from "./analytics";
import { alignByDate, datedReturns, weightedIndexReturns } from "./marketBenchmark";
import { byInvestableCapDesc, investableMarketCap } from "./floatAdjustedCap";

/**
 * Server-only. Cross-sectional "market statistics" — how the whole exchange
 * looks in aggregate, complementing /analytics's per-stock rankings and sector
 * correlation:
 *
 *  1. Breadth (today): advancers/decliners and the distribution of today's %
 *     changes across every tracked stock (from daily quotes — cheap).
 *  2. Trend breadth: share of the large-cap universe trading above its 50- and
 *     200-day moving average.
 *  3. Cross-sectional distributions: histograms of 1-year return, annualized
 *     volatility, and beta across that universe.
 *  4. Market cohesion: the average correlation of stocks to the reconstructed
 *     benchmark — high = a "risk-on/off" market moving as one, low = a
 *     stock-picker's market.
 *
 * Deeper stats use the top LARGE_CAP_UNIVERSE by market cap (not all 282):
 * small, thinly-traded tickers have noisy/sparse history that would distort a
 * market-wide distribution more than it'd inform it. One multi-ticker history
 * read + pure math, hourly-revalidated.
 */

const LOOKBACK_DAYS = 400;
const LARGE_CAP_UNIVERSE = 100;
const MIN_CLOSES = 60;

export interface BreadthStats {
  advancers: number;
  decliners: number;
  unchanged: number;
  noData: number;
  todayMean: number | null;
  todayMedian: number | null;
  todayStdev: number | null;
  todayPositivePct: number | null;
  todayHistogram: HistogramBin[];
}

export interface Distribution {
  bins: HistogramBin[];
  median: number | null;
  /** Count of stocks that contributed a value (the distribution's n). */
  n: number;
}

export interface MarketStats {
  source: "real" | "mock";
  asOf: string | null;
  totalTracked: number;
  breadth: BreadthStats;
  universeSize: number;
  above50Pct: number | null;
  above200Pct: number | null;
  avgCorrelationToMarket: number | null;
  distributions: {
    return1y: Distribution;
    volatility: Distribution;
    beta: Distribution;
  } | null;
}

export async function getMarketStats(): Promise<MarketStats> {
  const quotes = await getDailyQuotes();
  const totalTracked = quotes.length;

  // --- Breadth from today's quotes (all tracked stocks) ---
  let advancers = 0;
  let decliners = 0;
  let unchanged = 0;
  let noData = 0;
  const todayPct: number[] = [];
  for (const q of quotes) {
    if (q.pctChange == null) {
      noData += 1;
      continue;
    }
    todayPct.push(q.pctChange);
    if (q.pctChange > 0) advancers += 1;
    else if (q.pctChange < 0) decliners += 1;
    else unchanged += 1;
  }
  const breadth: BreadthStats = {
    advancers,
    decliners,
    unchanged,
    noData,
    todayMean: todayPct.length ? mean(todayPct) : null,
    todayMedian: percentile(todayPct, 50),
    todayStdev: todayPct.length >= 2 ? stdev(todayPct) : null,
    todayPositivePct: todayPct.length ? (advancers / todayPct.length) * 100 : null,
    todayHistogram: histogram(todayPct, 31),
  };

  // --- Deeper stats over the large-cap universe (needs history) ---
  // Float-adjusted (see lib/floatAdjustedCap.ts) for both the universe cut and
  // the weights below. Breadth above is unaffected either way: it's one vote
  // per stock, which no cap figure distorts.
  const ranked = [...quotes].sort(byInvestableCapDesc).slice(0, LARGE_CAP_UNIVERSE);
  const fromDate = isoDaysAgo(LOOKBACK_DAYS);
  const { source, history } = await getHistoricalQuotesLenient(
    ranked.map((q) => q.ticker),
    fromDate
  );

  const universe = ranked.filter((q) => (history[q.ticker]?.length ?? 0) >= MIN_CLOSES);
  if (source !== "real" || universe.length < 5) {
    return {
      source: "mock",
      asOf: null,
      totalTracked,
      breadth,
      universeSize: 0,
      above50Pct: null,
      above200Pct: null,
      avgCorrelationToMarket: null,
      distributions: null,
    };
  }

  const benchmark = weightedIndexReturns(
    universe.map((q) => ({ returns: datedReturns(history[q.ticker]), weight: investableMarketCap(q) }))
  );

  const vols: number[] = [];
  const ret1ys: number[] = [];
  const betas: number[] = [];
  const corrs: number[] = [];
  let above50 = 0;
  let above50Total = 0;
  let above200 = 0;
  let above200Total = 0;

  for (const q of universe) {
    const closes = history[q.ticker].map((c) => c.close);
    const price = closes[closes.length - 1];

    const vol = annualizedVolatility(closes);
    if (vol != null) vols.push(vol);
    const r1y = trailingReturn(closes, 251);
    if (r1y != null) ret1ys.push(r1y);

    const stockReturns = new Map(datedReturns(history[q.ticker]).map((r) => [r.date, r.ret]));
    const aligned = alignByDate(stockReturns, benchmark);
    const b = beta(aligned.a, aligned.b);
    if (b != null) betas.push(b);
    const c = correlation(aligned.a, aligned.b);
    if (c != null) corrs.push(c);

    const ma50 = sma(closes, 50);
    if (ma50 != null) {
      above50Total += 1;
      if (price >= ma50) above50 += 1;
    }
    const ma200 = sma(closes, 200);
    if (ma200 != null) {
      above200Total += 1;
      if (price >= ma200) above200 += 1;
    }
  }

  const allDates = universe.flatMap((q) => history[q.ticker].map((c) => c.date));
  const asOf = allDates.length ? allDates.reduce((a, b) => (a > b ? a : b)) : null;

  return {
    source: "real",
    asOf,
    totalTracked,
    breadth,
    universeSize: universe.length,
    above50Pct: above50Total ? (above50 / above50Total) * 100 : null,
    above200Pct: above200Total ? (above200 / above200Total) * 100 : null,
    avgCorrelationToMarket: corrs.length ? mean(corrs) : null,
    distributions: {
      return1y: distribution(ret1ys, 25),
      volatility: distribution(vols, 25),
      beta: distribution(betas, 25),
    },
  };
}

function distribution(xs: number[], bins: number): Distribution {
  return { bins: histogram(xs, bins), median: percentile(xs, 50), n: xs.length };
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString().slice(0, 10);
}
