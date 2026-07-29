import type { PseSector, Quote } from "@pseye/source-quotes";
import { getDailyQuotes } from "./quotes";
import { getDividendScreener } from "./dividends";
import { investableMarketCap } from "./floatAdjustedCap";

export interface ScreenerRow {
  ticker: string;
  companyName: string;
  sector: PseSector;
  /** null mirrors Quote.price — no trade to report, render "N/A". */
  price: number | null;
  pctChange: number | null;
  /** Raw PSE Edge market cap — price x total outstanding shares. Still sortable in its own column. */
  marketCap: number;
  /** marketCap x free float, the table's default sort. See lib/floatAdjustedCap.ts. */
  investableMarketCap: number;
  /** PSE Edge's "Free Float Level(%)" (0-100), or null when it doesn't publish one. */
  freeFloatPct: number | null;
  /** Trailing-12-month dividend yield %, reused from getDividendScreener; null for non-payers or when price is null. */
  yieldPct: number | null;
}

/**
 * Pure join so it's unit-testable without a DB: every quote becomes one
 * screener row, with the trailing-12-month yield looked up per ticker. Unlike
 * buildDividendScreener (which keeps only dividend payers — it's a dividend
 * list), this keeps the whole board: the screener is meant to be every tracked
 * stock, filterable, so a non-payer just has a null yield rather than dropping out.
 *
 * Carries both cap figures. The screener is a data table rather than a ranking,
 * so the raw market cap stays a first-class sortable column — but its default
 * order is the float-adjusted one, matching /rankings and the market map's box
 * sizes (see lib/floatAdjustedCap.ts). Before that, sorting the board by size
 * put Manulife and Sun Life on top of SM and BDO here while /rankings had them
 * at #65 and #49, which read as one of the two pages being broken.
 */
export function buildScreenerRows(quotes: Quote[], yieldByTicker: Map<string, number | null>): ScreenerRow[] {
  return quotes.map((q) => ({
    ticker: q.ticker,
    companyName: q.companyName,
    sector: q.sector,
    price: q.price,
    pctChange: q.pctChange,
    marketCap: q.marketCap,
    investableMarketCap: investableMarketCap(q),
    freeFloatPct: q.freeFloatPct ?? null,
    yieldPct: yieldByTicker.get(q.ticker) ?? null,
  }));
}

/**
 * The full-board screener: same DB-or-mock quotes the market map shows (no
 * separate "sample data" caveat for parity with the homepage), enriched with
 * the dividend yield already computed by getDividendScreener. Both underlying
 * sources keep their own fallback contract, so this never throws on a missing DB.
 */
export async function getScreener(): Promise<ScreenerRow[]> {
  const [quotes, dividends] = await Promise.all([getDailyQuotes(), getDividendScreener()]);
  const yieldByTicker = new Map(dividends.rows.map((r) => [r.ticker, r.yieldPct]));
  return buildScreenerRows(quotes, yieldByTicker);
}
