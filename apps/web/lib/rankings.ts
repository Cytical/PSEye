import type { PseSector, Quote } from "@pseye/source-quotes";
import { getDailyQuotes } from "./quotes";

export interface RankingRow {
  ticker: string;
  companyName: string;
  sector: PseSector;
  price: number | null;
  pctChange: number | null;
  marketCap: number;
  /** Rank 1..N among every company with marketCap > 0 — a tie-break by ticker keeps ordering deterministic. */
  overallRank: number;
  /** Rank 1..M within just this row's sector. */
  sectorRank: number;
}

/**
 * Ranks by market cap only — same field the screener already sorts on, so a
 * company's position here always agrees with its screener sort order. Quotes
 * with marketCap <= 0 (no shares-outstanding data, e.g. a newly-listed or
 * suspended ticker) are excluded rather than ranked last: a rank implies a
 * known size, and 0 isn't a real market cap, just an absence of one.
 */
export function buildRankings(quotes: Quote[]): RankingRow[] {
  const ranked = quotes
    .filter((q) => q.marketCap > 0)
    .sort((a, b) => b.marketCap - a.marketCap || a.ticker.localeCompare(b.ticker));

  const sectorCounters = new Map<PseSector, number>();

  return ranked.map((q, i) => {
    const sectorRank = (sectorCounters.get(q.sector) ?? 0) + 1;
    sectorCounters.set(q.sector, sectorRank);
    return {
      ticker: q.ticker,
      companyName: q.companyName,
      sector: q.sector,
      price: q.price,
      pctChange: q.pctChange,
      marketCap: q.marketCap,
      overallRank: i + 1,
      sectorRank,
    };
  });
}

export interface RankingsData {
  rows: RankingRow[];
  /** How many tracked companies had no market cap and were excluded from ranking. */
  excludedCount: number;
}

export async function getRankings(): Promise<RankingsData> {
  const quotes = await getDailyQuotes();
  const rows = buildRankings(quotes);
  return { rows, excludedCount: quotes.length - rows.length };
}
