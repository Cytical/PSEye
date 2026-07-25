import type { HistoricalClose } from "@pseye/source-quotes";

/**
 * Pure quantitative-analytics helpers over a daily close series (or plain
 * number arrays). No React/DOM/DB dependency — kept that way so it's
 * unit-testable in isolation and reusable from any server component that
 * already holds a stock's `historical_quotes` closes. Every function here is
 * derived math over data we already fetch; none issues its own query.
 *
 * Conventions:
 *  - "closes" are ascending by date (as getHistoricalQuotes returns them).
 *  - Daily returns are simple returns rᵢ = closeᵢ/closeᵢ₋₁ − 1 unless a
 *    function's name says log. Volatility uses log returns (the standard for
 *    annualizing) — see `annualizedVolatility`.
 *  - 252 = trading days per year, the usual annualization factor for a market
 *    that trades ~weekdays-minus-holidays.
 */

export const TRADING_DAYS_PER_YEAR = 252;

/** Simple daily returns; length = closes.length − 1. Skips any non-positive close (guards div-by-zero on bad data). */
export function dailyReturns(closes: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const prev = closes[i - 1];
    if (prev > 0) out.push(closes[i] / prev - 1);
  }
  return out;
}

/** Natural-log daily returns; the correct basis for annualizing volatility. */
export function logReturns(closes: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < closes.length; i++) {
    const prev = closes[i - 1];
    const cur = closes[i];
    if (prev > 0 && cur > 0) out.push(Math.log(cur / prev));
  }
  return out;
}

export function mean(xs: number[]): number {
  if (xs.length === 0) return NaN;
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}

/** Sample standard deviation (n−1). Returns NaN for fewer than 2 points. */
export function stdev(xs: number[]): number {
  if (xs.length < 2) return NaN;
  const m = mean(xs);
  const variance = xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(variance);
}

/**
 * Annualized volatility (%) from daily log returns: stdev(logReturns) × √252,
 * expressed as a percentage. Needs at least ~a few weeks of closes to be
 * meaningful; returns null below `minReturns` daily returns.
 */
export function annualizedVolatility(closes: number[], minReturns = 20): number | null {
  const rets = logReturns(closes);
  if (rets.length < minReturns) return null;
  const daily = stdev(rets);
  if (!Number.isFinite(daily)) return null;
  return daily * Math.sqrt(TRADING_DAYS_PER_YEAR) * 100;
}

/** Latest simple moving average over the last `window` closes, or null if too few closes. */
export function sma(closes: number[], window: number): number | null {
  if (closes.length < window || window <= 0) return null;
  const slice = closes.slice(-window);
  return mean(slice);
}

/**
 * Wilder's RSI over the last `period` closes (default 14), 0–100, or null if
 * too few closes. Uses Wilder smoothing (the standard) rather than a plain SMA
 * of gains/losses. A flat/rising series with no losses returns 100.
 */
export function rsi(closes: number[], period = 14): number | null {
  if (closes.length < period + 1) return null;

  let avgGain = 0;
  let avgLoss = 0;
  // Seed with the simple average of the first `period` changes.
  for (let i = 1; i <= period; i++) {
    const change = closes[i] - closes[i - 1];
    if (change >= 0) avgGain += change;
    else avgLoss -= change;
  }
  avgGain /= period;
  avgLoss /= period;

  // Wilder-smooth the rest.
  for (let i = period + 1; i < closes.length; i++) {
    const change = closes[i] - closes[i - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? -change : 0;
    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

/**
 * Maximum peak-to-trough drawdown over the series, as a negative percentage
 * (e.g. −32.5 means the price fell 32.5% below a prior peak at its worst).
 * Returns 0 for a monotonically non-decreasing series, null for < 2 closes.
 */
export function maxDrawdown(closes: number[]): number | null {
  if (closes.length < 2) return null;
  let peak = closes[0];
  let maxDd = 0;
  for (const c of closes) {
    if (c > peak) peak = c;
    if (peak > 0) {
      const dd = c / peak - 1;
      if (dd < maxDd) maxDd = dd;
    }
  }
  return maxDd * 100;
}

/**
 * Total return (%) over the last `days` trading rows: last close vs the close
 * `days` rows back. Uses row count, not calendar days, so it's robust to gaps.
 * Returns null if the series is shorter than `days + 1`.
 */
export function trailingReturn(closes: number[], days: number): number | null {
  if (closes.length < days + 1) return null;
  const start = closes[closes.length - 1 - days];
  const end = closes[closes.length - 1];
  if (start <= 0) return null;
  return (end / start - 1) * 100;
}

/** Pearson correlation of two equal-length return series, in [−1, 1], or null if undefined. */
export function correlation(a: number[], b: number[]): number | null {
  const n = Math.min(a.length, b.length);
  if (n < 2) return null;
  const aa = a.slice(-n);
  const bb = b.slice(-n);
  const ma = mean(aa);
  const mb = mean(bb);
  let cov = 0;
  let va = 0;
  let vb = 0;
  for (let i = 0; i < n; i++) {
    const da = aa[i] - ma;
    const db = bb[i] - mb;
    cov += da * db;
    va += da * da;
    vb += db * db;
  }
  if (va === 0 || vb === 0) return null;
  return cov / Math.sqrt(va * vb);
}

/**
 * Beta of a stock's returns against the market's returns: cov(stock, market) /
 * var(market). β=1 moves with the market; β>1 is more volatile than it, β<1
 * less; β<0 moves opposite. Both arrays must already be aligned (same dates,
 * same order) — see `alignedReturns`. Returns null if var(market)=0 or n<2.
 */
export function beta(stockReturns: number[], marketReturns: number[]): number | null {
  const n = Math.min(stockReturns.length, marketReturns.length);
  if (n < 2) return null;
  const s = stockReturns.slice(-n);
  const m = marketReturns.slice(-n);
  const ms = mean(s);
  const mm = mean(m);
  let cov = 0;
  let varM = 0;
  for (let i = 0; i < n; i++) {
    cov += (s[i] - ms) * (m[i] - mm);
    varM += (m[i] - mm) ** 2;
  }
  if (varM === 0) return null;
  return cov / varM;
}

/**
 * Aligns two daily-close series by shared calendar date, then returns their
 * simple daily returns over that shared, gap-consistent window. Two PSE series
 * can differ in start date or have holiday/suspension gaps, so returns must be
 * computed on the intersection of their trading days rather than by array
 * position — otherwise beta/correlation would silently compare mismatched days.
 */
export function alignedReturns(
  a: HistoricalClose[],
  b: HistoricalClose[]
): { a: number[]; b: number[] } {
  const mapB = new Map(b.map((p) => [p.date, p.close]));
  const closesA: number[] = [];
  const closesB: number[] = [];
  for (const p of a) {
    const bc = mapB.get(p.date);
    if (bc != null) {
      closesA.push(p.close);
      closesB.push(bc);
    }
  }
  return { a: dailyReturns(closesA), b: dailyReturns(closesB) };
}

/**
 * A qualitative label for an RSI reading, using the conventional 30/70 bands.
 * Returned as a plain string so both the stock page and any leaderboard read
 * the same wording.
 */
export function rsiLabel(value: number): "oversold" | "neutral" | "overbought" {
  if (value <= 30) return "oversold";
  if (value >= 70) return "overbought";
  return "neutral";
}
