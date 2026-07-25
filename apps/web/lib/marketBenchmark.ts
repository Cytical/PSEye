import type { HistoricalClose } from "@pseye/source-quotes";

/**
 * Shared building blocks for reconstructing a market benchmark from
 * constituents' own closes and aligning per-stock returns to it. Used by both
 * lib/marketAnalytics.ts (beta leaderboard, sector correlation) and
 * lib/marketStats.ts (cross-sectional distributions, breadth) so the "PSEye
 * Composite" is built the same way in both places.
 */

export interface DatedReturn {
  date: string;
  ret: number;
}

/** Simple daily returns tagged with their date, for date-keyed alignment across gappy series. */
export function datedReturns(closes: HistoricalClose[]): DatedReturn[] {
  const out: DatedReturn[] = [];
  for (let i = 1; i < closes.length; i++) {
    const prev = closes[i - 1].close;
    if (prev > 0) out.push({ date: closes[i].date, ret: closes[i].close / prev - 1 });
  }
  return out;
}

/** Weighted average return per date across constituents (a reconstructed index return series). */
export function weightedIndexReturns(
  parts: { returns: DatedReturn[]; weight: number }[]
): Map<string, number> {
  const acc = new Map<string, { sum: number; weight: number }>();
  for (const { returns, weight } of parts) {
    for (const { date, ret } of returns) {
      const cur = acc.get(date) ?? { sum: 0, weight: 0 };
      cur.sum += ret * weight;
      cur.weight += weight;
      acc.set(date, cur);
    }
  }
  const out = new Map<string, number>();
  for (const [date, { sum, weight }] of acc) if (weight > 0) out.set(date, sum / weight);
  return out;
}

/** Two return arrays over the dates both maps share, order-consistent between them. */
export function alignByDate(
  a: Map<string, number>,
  b: Map<string, number>
): { a: number[]; b: number[] } {
  const ra: number[] = [];
  const rb: number[] = [];
  for (const [date, va] of a) {
    const vb = b.get(date);
    if (vb != null) {
      ra.push(va);
      rb.push(vb);
    }
  }
  return { a: ra, b: rb };
}
