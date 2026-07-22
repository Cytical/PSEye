import type { PseSector, Quote } from "@pseye/source-quotes";
import { getDailyQuotes } from "./quotes";

export interface VolumeLeaderRow {
  ticker: string;
  companyName: string;
  sector: PseSector;
  price: number | null;
  pctChange: number | null;
  volume: number;
  value: number;
  /** Rank 1..N by ₱ turnover (value) descending — the standard "most active" measure, since it's
   * comparable across stocks regardless of share price (unlike raw share volume). */
  rank: number;
}

/**
 * Ranks by traded ₱ value (turnover), not raw share volume — a ₱0.02 stock
 * trading 50M shares and a ₱2,000 stock trading 500 shares both move real
 * money, but only value puts them on the same scale. Quotes with no
 * volume/value on record (not yet backfilled, or a suspended/untraded ticker
 * today) are excluded rather than ranked last, same convention as
 * rankings.ts's marketCap <= 0 exclusion.
 */
export function buildVolumeLeaders(quotes: Quote[]): VolumeLeaderRow[] {
  return quotes
    .filter((q): q is Quote & { volume: number; value: number } => (q.value ?? 0) > 0 && (q.volume ?? 0) > 0)
    .sort((a, b) => b.value - a.value || a.ticker.localeCompare(b.ticker))
    .map((q, i) => ({
      ticker: q.ticker,
      companyName: q.companyName,
      sector: q.sector,
      price: q.price,
      pctChange: q.pctChange,
      volume: q.volume,
      value: q.value,
      rank: i + 1,
    }));
}

export interface VolumeLeadersData {
  rows: VolumeLeaderRow[];
  /** How many tracked companies had no volume/value on record and were excluded. */
  excludedCount: number;
}

export async function getVolumeLeaders(): Promise<VolumeLeadersData> {
  const quotes = await getDailyQuotes();
  const rows = buildVolumeLeaders(quotes);
  return { rows, excludedCount: quotes.length - rows.length };
}
