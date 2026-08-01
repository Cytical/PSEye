import { mean, percentile, stdev, TRADING_DAYS_PER_YEAR } from "./analytics";
import { loadUniverse } from "./marketUniverse";

/**
 * Server-only. Classifies the market's history into risk-on / neutral /
 * risk-off regimes from the reconstructed cap-weighted composite index, using
 * three transparent, slow-moving signals:
 *   • trend  — index above/below its 200-day moving average
 *   • stress — drawdown from the running peak
 *   • vol    — 30-day realized volatility vs its own historical median
 *
 * Rule-based and fully explainable (no black box): a downtrend under stress or
 * elevated volatility is risk-off; a calm uptrend near highs is risk-on;
 * everything else is neutral. Labels are 5-day majority-smoothed to damp
 * one-day whipsaws. Descriptive regime accounting over PAST data — not a
 * prediction of the next regime.
 */

export type Regime = "risk-on" | "neutral" | "risk-off";

export interface RegimePoint {
  date: string;
  level: number;
  regime: Regime;
}

export interface RegimeStat {
  regime: Regime;
  days: number;
  pctTime: number;
  /** Average daily composite return while in this regime, % (descriptive, not forward-looking). */
  avgDailyReturn: number;
}

export interface CurrentRegime {
  regime: Regime;
  level: number;
  ma200: number;
  pctVs200: number;
  drawdown: number;
  vol30: number;
  elevatedVol: boolean;
  /** Date the current uninterrupted regime run began. */
  since: string;
}

export interface MarketRegimeResult {
  source: "real" | "mock";
  asOf: string | null;
  points: RegimePoint[];
  current: CurrentRegime | null;
  stats: RegimeStat[];
}

const MA_LONG = 200;
const VOL_WINDOW = 30;
const SMOOTH = 5;

export async function getMarketRegime(): Promise<MarketRegimeResult> {
  // size: 40, not 100 — loadUniverse's underlying read (historicalQuotes.ts's
  // fetchHistoricalQuotesRows) is a single unstable_cache entry per (tickers,
  // fromDate) call, and Next's Data Cache rejects any entry over 2MB. 100
  // tickers x ~1600 days serialized to ~3.7MB, confirmed live via a real
  // `next build` ("Failed to set Next.js data cache for unstable_cache
  // /regime ... items over 2MB can not be cached") — so this specific call
  // was silently never cached, re-querying Neon on every render instead of
  // reusing the same 3600s window every other page gets. 40 tickers keeps the
  // same lookbackDays (regime detection wants the years of history, not
  // breadth) while landing well under the limit (~1.5MB).
  const { source, benchmark, asOf } = await loadUniverse({ size: 40, minCloses: 250, lookbackDays: 1600 });
  if (source !== "real" || benchmark.size < MA_LONG + VOL_WINDOW + 30) {
    return { source: "mock", asOf: null, points: [], current: null, stats: [] };
  }

  const series = [...benchmark.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1));
  const dates = series.map(([d]) => d);
  const returns = series.map(([, r]) => r);

  // Composite index level, indexed to 100 at the first date.
  const levels: number[] = [100];
  for (let i = 1; i < returns.length; i++) levels.push(levels[i - 1] * (1 + returns[i]));

  // Per-day signals.
  const ma200: (number | null)[] = [];
  const drawdown: number[] = [];
  const vol30: (number | null)[] = [];
  let peak = -Infinity;
  for (let i = 0; i < levels.length; i++) {
    peak = Math.max(peak, levels[i]);
    drawdown.push(levels[i] / peak - 1);
    ma200.push(i >= MA_LONG - 1 ? mean(levels.slice(i - MA_LONG + 1, i + 1)) : null);
    vol30.push(
      i >= VOL_WINDOW ? stdev(returns.slice(i - VOL_WINDOW + 1, i + 1)) * Math.sqrt(TRADING_DAYS_PER_YEAR) * 100 : null
    );
  }

  const volMedian = percentile(vol30.filter((v): v is number => v != null), 50) ?? 0;

  // Raw regime label per day (only once all signals are available).
  const rawStart = MA_LONG; // ensures ma200 and vol30 both exist
  const rawRegimes: Regime[] = [];
  for (let i = rawStart; i < levels.length; i++) {
    const belowLong = levels[i] < (ma200[i] as number);
    const dd = drawdown[i];
    const elevatedVol = (vol30[i] as number) > volMedian;
    let regime: Regime;
    if (belowLong && (dd <= -0.1 || elevatedVol)) regime = "risk-off";
    else if (!belowLong && dd > -0.05 && !elevatedVol) regime = "risk-on";
    else regime = "neutral";
    rawRegimes.push(regime);
  }

  // 5-day majority smoothing.
  const smoothed = rawRegimes.map((_, idx) => {
    const lo = Math.max(0, idx - Math.floor(SMOOTH / 2));
    const hi = Math.min(rawRegimes.length, idx + Math.ceil(SMOOTH / 2));
    return majority(rawRegimes.slice(lo, hi));
  });

  const points: RegimePoint[] = smoothed.map((regime, k) => {
    const i = rawStart + k;
    return { date: dates[i], level: Math.round(levels[i] * 100) / 100, regime };
  });

  // Regime accounting.
  const stats: RegimeStat[] = (["risk-on", "neutral", "risk-off"] as Regime[]).map((regime) => {
    const dayIdx = smoothed.map((r, k) => (r === regime ? rawStart + k : -1)).filter((i) => i >= 0);
    const rets = dayIdx.map((i) => returns[i]);
    return {
      regime,
      days: dayIdx.length,
      pctTime: (dayIdx.length / smoothed.length) * 100,
      avgDailyReturn: rets.length ? mean(rets) * 100 : 0,
    };
  });

  // Current regime + its driving signals + how long it's held.
  const lastK = smoothed.length - 1;
  const lastI = levels.length - 1;
  let sinceK = lastK;
  while (sinceK > 0 && smoothed[sinceK - 1] === smoothed[lastK]) sinceK--;
  const current: CurrentRegime = {
    regime: smoothed[lastK],
    level: Math.round(levels[lastI] * 100) / 100,
    ma200: Math.round((ma200[lastI] as number) * 100) / 100,
    pctVs200: (levels[lastI] / (ma200[lastI] as number) - 1) * 100,
    drawdown: drawdown[lastI] * 100,
    vol30: vol30[lastI] as number,
    elevatedVol: (vol30[lastI] as number) > volMedian,
    since: dates[rawStart + sinceK],
  };

  return { source: "real", asOf, points, current, stats };
}

function majority(regimes: Regime[]): Regime {
  const counts: Record<Regime, number> = { "risk-on": 0, neutral: 0, "risk-off": 0 };
  for (const r of regimes) counts[r]++;
  let best: Regime = "neutral";
  let bestN = -1;
  for (const r of ["risk-on", "neutral", "risk-off"] as Regime[]) {
    if (counts[r] > bestN) {
      bestN = counts[r];
      best = r;
    }
  }
  return best;
}
