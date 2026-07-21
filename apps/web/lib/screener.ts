import type { PseSector, Quote } from "@pseye/source-quotes";
import { getDailyQuotes } from "./quotes";
import { getDividendScreener } from "./dividends";

export interface ScreenerRow {
  ticker: string;
  companyName: string;
  sector: PseSector;
  /** null mirrors Quote.price — no trade to report, render "N/A". */
  price: number | null;
  pctChange: number | null;
  marketCap: number;
  /** Trailing-12-month dividend yield %, reused from getDividendScreener; null for non-payers or when price is null. */
  yieldPct: number | null;
}

/**
 * Pure join so it's unit-testable without a DB: every quote becomes one
 * screener row, with the trailing-12-month yield looked up per ticker. Unlike
 * buildDividendScreener (which keeps only dividend payers — it's a dividend
 * list), this keeps the whole board: the screener is meant to be every tracked
 * stock, filterable, so a non-payer just has a null yield rather than dropping out.
 */
export function buildScreenerRows(quotes: Quote[], yieldByTicker: Map<string, number | null>): ScreenerRow[] {
  return quotes.map((q) => ({
    ticker: q.ticker,
    companyName: q.companyName,
    sector: q.sector,
    price: q.price,
    pctChange: q.pctChange,
    marketCap: q.marketCap,
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
