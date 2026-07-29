import type { PseSector, Quote } from "@pseye/source-quotes";
import { getDailyQuotes } from "./quotes";
import { byInvestableCapDesc, investableMarketCap } from "./floatAdjustedCap";

export interface RankingRow {
  ticker: string;
  companyName: string;
  sector: PseSector;
  price: number | null;
  pctChange: number | null;
  /** Raw PSE Edge market cap — price x total outstanding shares. Reported, not ranked on. */
  marketCap: number;
  /** The value rows are actually ordered by: marketCap x free float. See lib/floatAdjustedCap.ts. */
  investableMarketCap: number;
  /** PSE Edge's "Free Float Level(%)" (0-100), or null when it doesn't publish one. */
  freeFloatPct: number | null;
  /** Rank 1..N among every company with marketCap > 0 — a tie-break by ticker keeps ordering deterministic. */
  overallRank: number;
  /** Rank 1..M within just this row's sector. */
  sectorRank: number;
}

/**
 * Ranks by float-adjusted market cap — the tradeable slice of each company,
 * not its whole share count. See lib/floatAdjustedCap.ts for why (short
 * version: two foreign dual-listings otherwise take the top two slots on the
 * strength of shares that don't trade here).
 *
 * This is the same size the treemap market map draws its boxes with and the
 * screener's default sort, so a company's position here agrees with both —
 * that three-way agreement is the invariant worth preserving if any of them
 * changes.
 *
 * Quotes with marketCap <= 0 (no shares-outstanding data, e.g. a newly-listed
 * or suspended ticker) are excluded rather than ranked last: a rank implies a
 * known size, and 0 isn't a real market cap, just an absence of one. The filter
 * stays on the raw figure because that is the field that is genuinely missing —
 * a real cap with a real float can't produce a zero adjusted value.
 */
export function buildRankings(quotes: Quote[]): RankingRow[] {
  const ranked = quotes
    .filter((q) => q.marketCap > 0)
    .sort((a, b) => byInvestableCapDesc(a, b) || a.ticker.localeCompare(b.ticker));

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
      investableMarketCap: investableMarketCap(q),
      freeFloatPct: q.freeFloatPct ?? null,
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
