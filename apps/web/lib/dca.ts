import type { HistoricalClose } from "@pseye/source-quotes";

/**
 * Equal-weighted average of several tickers' close series, indexed to a base of
 * 10,000 at the first shared date. A simplified proxy for "invest across the
 * market" — not the official float-adjusted-market-cap PSEi.
 *
 * Aligns series by date, not by array position: real per-company history
 * (unlike the old fixed-length mock walk) can have gaps or differing start
 * dates (late listings, suspensions), so two tickers' `i`-th entries aren't
 * guaranteed to be the same calendar date. Only dates present in every
 * ticker's series are included, to keep the average honest rather than
 * silently blending mismatched dates.
 */
export function buildCompositeHistory(perTickerHistories: HistoricalClose[][]): HistoricalClose[] {
  const nonEmpty = perTickerHistories.filter((h) => h.length > 0);
  if (nonEmpty.length === 0) return [];

  const BASE_INDEX = 10_000;
  const closeByDate = nonEmpty.map((h) => new Map(h.map((p) => [p.date, p.close])));
  const sharedDates = nonEmpty[0]
    .map((p) => p.date)
    .filter((date) => closeByDate.every((m) => m.has(date)))
    .sort();
  if (sharedDates.length === 0) return [];

  const firstSharedDate = sharedDates[0];
  const baseCloses = closeByDate.map((m) => m.get(firstSharedDate)!);

  return sharedDates.map((date) => {
    const avgGrowth =
      closeByDate.reduce((sum, m, tickerIdx) => sum + m.get(date)! / baseCloses[tickerIdx], 0) / nonEmpty.length;
    return { date, close: Math.round(avgGrowth * BASE_INDEX * 100) / 100 };
  });
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
