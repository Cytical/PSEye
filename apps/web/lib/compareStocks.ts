import type { HistoricalClose } from "@pseye/source-quotes";

export interface CompareSeriesInput {
  ticker: string;
  companyName: string;
  closes: HistoricalClose[];
}

export interface NormalizedSeries {
  ticker: string;
  companyName: string;
  points: { date: string; pct: number }[];
}

/**
 * Rebases each series to "% change since the first shared date" — the only
 * fair way to compare stocks with wildly different share prices on one
 * chart (a ₱2 stock and a ₱1,000 stock aren't comparable by raw price).
 * Only dates present in every series are included, same alignment approach
 * as buildCompositeHistory in dca.ts, for the same reason: real per-company
 * history can have gaps or differing start dates (late listings,
 * suspensions), so naively zipping by array index could pair mismatched
 * calendar dates.
 */
export function normalizeCompareSeries(series: CompareSeriesInput[]): NormalizedSeries[] {
  if (series.length === 0) return [];

  const closeByDate = series.map((s) => new Map(s.closes.map((c) => [c.date, c.close])));
  if (closeByDate.some((m) => m.size === 0)) return [];

  const sharedDates = series[0].closes
    .map((c) => c.date)
    .filter((date) => closeByDate.every((m) => m.has(date)))
    .sort();
  if (sharedDates.length === 0) return [];

  const firstDate = sharedDates[0];
  const baseCloses = closeByDate.map((m) => m.get(firstDate)!);

  return series.map((s, i) => ({
    ticker: s.ticker,
    companyName: s.companyName,
    points: sharedDates.map((date) => ({
      date,
      pct: ((closeByDate[i].get(date)! - baseCloses[i]) / baseCloses[i]) * 100,
    })),
  }));
}
