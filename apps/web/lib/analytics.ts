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

// ---------------------------------------------------------------------------
// Statistical profile — the "advanced statistics" layer (risk-adjusted return,
// distribution shape, tail risk, seasonality). All close-based: historical_
// quotes stores close only, no OHLC, so anything needing intraday range (ATR,
// Bollinger, true-range gaps) is deliberately out of scope here.
// ---------------------------------------------------------------------------

/**
 * A round PH short-rate proxy (~91-day T-bill / BSP policy area) for the
 * excess-return term in Sharpe/Sortino. Intentionally a stated assumption, not
 * a live sourced feed — surfaced in the UI so the reader knows it's a constant.
 */
export const PH_ANNUAL_RISK_FREE = 0.0575;

/** Convert an annual rate to its equivalent per-trading-day compounding rate. */
export function toDailyRate(annual: number): number {
  return (1 + annual) ** (1 / TRADING_DAYS_PER_YEAR) - 1;
}

/**
 * Annualized return (CAGR-style, %) implied by the first→last close over the
 * window: (last/first)^(252/steps) − 1. `steps` is the number of trading-day
 * intervals, so a ~1-year window annualizes to roughly its raw total return.
 */
export function annualizedReturn(closes: number[]): number | null {
  if (closes.length < 2) return null;
  const first = closes[0];
  const last = closes[closes.length - 1];
  if (first <= 0 || last <= 0) return null;
  const steps = closes.length - 1;
  return ((last / first) ** (TRADING_DAYS_PER_YEAR / steps) - 1) * 100;
}

/**
 * Downside deviation: root-mean-square of returns that fell below `mar`
 * (minimum acceptable return, default 0), dividing by ALL observations (the
 * standard convention) so it's directly comparable to stdev. The volatility of
 * losses only — Sortino's denominator.
 */
export function downsideDeviation(returns: number[], mar = 0): number | null {
  if (returns.length < 2) return null;
  let sumSq = 0;
  for (const r of returns) {
    const d = Math.min(0, r - mar);
    sumSq += d * d;
  }
  return Math.sqrt(sumSq / returns.length);
}

/**
 * Annualized Sharpe ratio: (mean daily return − daily risk-free) / stdev of
 * daily returns, scaled by √252. Excess return per unit of total volatility.
 * Returns null if volatility is zero/undefined.
 */
export function sharpeRatio(returns: number[], riskFreeDaily = 0): number | null {
  if (returns.length < 2) return null;
  const sd = stdev(returns);
  if (!Number.isFinite(sd) || sd === 0) return null;
  return ((mean(returns) - riskFreeDaily) / sd) * Math.sqrt(TRADING_DAYS_PER_YEAR);
}

/**
 * Annualized Sortino ratio: like Sharpe but divides excess return by downside
 * deviation only, so upside volatility isn't penalized. Returns null if
 * downside deviation is zero/undefined.
 */
export function sortinoRatio(returns: number[], riskFreeDaily = 0): number | null {
  if (returns.length < 2) return null;
  const dd = downsideDeviation(returns, riskFreeDaily);
  if (dd == null || dd === 0) return null;
  return ((mean(returns) - riskFreeDaily) / dd) * Math.sqrt(TRADING_DAYS_PER_YEAR);
}

/**
 * Sample skewness (adjusted Fisher–Pearson standardized moment, i.e. Excel's
 * SKEW): >0 = a longer right tail (occasional big gains), <0 = longer left tail
 * (occasional big losses). Needs ≥3 points and non-zero spread.
 */
export function skewness(xs: number[]): number | null {
  const n = xs.length;
  if (n < 3) return null;
  const m = mean(xs);
  const s = stdev(xs);
  if (!Number.isFinite(s) || s === 0) return null;
  let sum = 0;
  for (const x of xs) sum += ((x - m) / s) ** 3;
  return (n / ((n - 1) * (n - 2))) * sum;
}

/**
 * Sample EXCESS kurtosis (Excel's KURT): 0 = normal-tailed, >0 = fat tails
 * (extreme days more frequent than a normal distribution predicts) — the
 * hallmark of financial returns. Needs ≥4 points and non-zero spread.
 */
export function excessKurtosis(xs: number[]): number | null {
  const n = xs.length;
  if (n < 4) return null;
  const m = mean(xs);
  const s = stdev(xs);
  if (!Number.isFinite(s) || s === 0) return null;
  let sum = 0;
  for (const x of xs) sum += ((x - m) / s) ** 4;
  const term = (n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3));
  const correction = (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));
  return term * sum - correction;
}

/** Linear-interpolated percentile (p in [0,100]) of a numeric sample, or null if empty. */
export function percentile(xs: number[], p: number): number | null {
  if (xs.length === 0) return null;
  const sorted = [...xs].sort((a, b) => a - b);
  if (sorted.length === 1) return sorted[0];
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (idx - lo) * (sorted[hi] - sorted[lo]);
}

/**
 * Historical (non-parametric) Value-at-Risk: the loss you'd meet or exceed on
 * the worst (1−confidence) share of days, read straight off the empirical
 * return distribution, returned as a POSITIVE percent loss. e.g. a 95% VaR of
 * 3.2 means "on the worst 5% of days, the stock fell at least ~3.2%." Needs
 * ≥20 returns to be meaningful.
 */
export function historicalVaR(returns: number[], confidence = 0.95): number | null {
  if (returns.length < 20) return null;
  const q = percentile(returns, (1 - confidence) * 100);
  if (q == null) return null;
  return -q * 100;
}

/** Share of returns strictly greater than zero, as a percent. Null for an empty series. */
export function positiveDayRatio(returns: number[]): number | null {
  if (returns.length === 0) return null;
  return (returns.filter((r) => r > 0).length / returns.length) * 100;
}

export interface HistogramBin {
  x0: number;
  x1: number;
  count: number;
}

/** Equal-width histogram of `xs` into `binCount` bins spanning [min, max]. The max value lands in the last bin. */
export function histogram(xs: number[], binCount = 21): HistogramBin[] {
  if (xs.length === 0 || binCount < 1) return [];
  let min = Infinity;
  let max = -Infinity;
  for (const x of xs) {
    if (x < min) min = x;
    if (x > max) max = x;
  }
  if (min === max) return [{ x0: min, x1: max, count: xs.length }];
  const width = (max - min) / binCount;
  const bins: HistogramBin[] = Array.from({ length: binCount }, (_, i) => ({
    x0: min + i * width,
    x1: min + (i + 1) * width,
    count: 0,
  }));
  for (const x of xs) {
    let idx = Math.floor((x - min) / width);
    if (idx >= binCount) idx = binCount - 1;
    if (idx < 0) idx = 0;
    bins[idx].count += 1;
  }
  return bins;
}

export interface MonthlyReturnStat {
  /** 1 = January … 12 = December. */
  month: number;
  /** Average of that calendar month's month-over-month returns across years, as a percent. Null if no sample. */
  avgReturn: number | null;
  /** How many years contributed a return for this month (the sample size — small here, so it's shown). */
  years: number;
}

/**
 * Seasonality: month-over-month returns (last-trading-day close of each month
 * vs the prior month's), grouped by calendar month and averaged across years.
 * Kept honest about sample size via `years` — with only a few years of PSE
 * history each month has a handful of observations, so this is descriptive
 * color, not a tradable "month effect".
 */
export function monthlyReturnStats(closes: HistoricalClose[]): MonthlyReturnStat[] {
  const monthEndClose = new Map<string, number>();
  for (const { date, close } of closes) monthEndClose.set(date.slice(0, 7), close); // ascending → last wins
  const monthKeys = [...monthEndClose.keys()].sort();

  const returnsByMonth = new Map<number, number[]>();
  for (let i = 1; i < monthKeys.length; i++) {
    const prev = monthEndClose.get(monthKeys[i - 1])!;
    const cur = monthEndClose.get(monthKeys[i])!;
    if (prev <= 0) continue;
    const monthNum = Number(monthKeys[i].slice(5, 7));
    let list = returnsByMonth.get(monthNum);
    if (!list) {
      list = [];
      returnsByMonth.set(monthNum, list);
    }
    list.push(cur / prev - 1);
  }

  const out: MonthlyReturnStat[] = [];
  for (let m = 1; m <= 12; m++) {
    const rs = returnsByMonth.get(m) ?? [];
    out.push({ month: m, avgReturn: rs.length ? mean(rs) * 100 : null, years: rs.length });
  }
  return out;
}
