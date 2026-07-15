import type { HistoricalClose } from "@pseye/source-quotes";

/**
 * Equal-weighted average of several tickers' close series, indexed to a base of
 * 10,000 at the first shared date. A simplified proxy for "invest across the
 * market" — not the official float-adjusted-market-cap PSEi.
 */
export function buildCompositeHistory(perTickerHistories: HistoricalClose[][]): HistoricalClose[] {
  const nonEmpty = perTickerHistories.filter((h) => h.length > 0);
  if (nonEmpty.length === 0) return [];

  const length = Math.min(...nonEmpty.map((h) => h.length));
  const baseCloses = nonEmpty.map((h) => h[0].close);
  const BASE_INDEX = 10_000;

  const composite: HistoricalClose[] = [];
  for (let i = 0; i < length; i++) {
    const avgGrowth =
      nonEmpty.reduce((sum, h, tickerIdx) => sum + h[i].close / baseCloses[tickerIdx], 0) / nonEmpty.length;
    composite.push({ date: nonEmpty[0][i].date, close: Math.round(avgGrowth * BASE_INDEX * 100) / 100 });
  }
  return composite;
}

export type DcaFrequency = "weekly" | "monthly";

export interface DcaParams {
  contribution: number;
  frequency: DcaFrequency;
}

export interface DcaPoint {
  date: string;
  contributed: number;
  value: number;
}

export interface DcaResult {
  totalContributed: number;
  totalShares: number;
  currentValue: number;
  returnPct: number;
  timeline: DcaPoint[];
}

/**
 * Simulates buying `contribution` worth of shares at the close on each period's
 * first trading day, then marks the running position to each subsequent close.
 * `history` must be ascending by date and cover at least one period.
 */
export function simulateDca(history: HistoricalClose[], params: DcaParams): DcaResult | null {
  if (history.length === 0) return null;

  const periodStarts = new Set(pickPeriodStartDates(history, params.frequency));

  let totalContributed = 0;
  let totalShares = 0;
  const timeline: DcaPoint[] = [];

  for (const point of history) {
    if (periodStarts.has(point.date)) {
      totalContributed += params.contribution;
      totalShares += params.contribution / point.close;
    }
    timeline.push({
      date: point.date,
      contributed: totalContributed,
      value: totalShares * point.close,
    });
  }

  const currentValue = totalShares * history[history.length - 1].close;
  return {
    totalContributed,
    totalShares,
    currentValue,
    returnPct: totalContributed > 0 ? ((currentValue - totalContributed) / totalContributed) * 100 : 0,
    timeline,
  };
}

/** First trading day on/after each period boundary (calendar week or month) from the series start. */
function pickPeriodStartDates(history: HistoricalClose[], frequency: DcaFrequency): string[] {
  const starts: string[] = [];
  let currentBucket = "";

  for (const { date } of history) {
    const bucket = frequency === "monthly" ? date.slice(0, 7) : isoWeekBucket(date);
    if (bucket !== currentBucket) {
      currentBucket = bucket;
      starts.push(date);
    }
  }

  return starts;
}

function isoWeekBucket(dateIso: string): string {
  const d = new Date(dateIso + "T00:00:00Z");
  // ISO week: Thursday of the current week determines the week-year.
  const dayNum = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((d.getTime() - firstThursday.getTime()) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}
