import type { PseSector, Quote } from "@pseye/source-quotes";
import { getDailyQuotes } from "./quotes";
import { getDividendScreener } from "./dividends";
import { getCompanyFinancials } from "./companyFinancials";
import { investableMarketCap } from "./floatAdjustedCap";
import { computeValuation, type Valuation } from "./valuation";

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
  /**
   * Price / annual basic EPS, and price / book value per share, derived in
   * lib/valuation.ts from company_financials.
   *
   * Null carries four different meanings and the UI must not distinguish
   * between them: no annual filing scraped for this ticker (the backfill is
   * manual, so coverage is partial), the stock did not trade, the company
   * reported a loss or negative book value, or the unit/currency cross-check
   * refused the figure. All four are "we will not print a number here".
   */
  peRatio: number | null;
  pbRatio: number | null;
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
 * order is investableMarketCap, matching /rankings and the market map's box
 * sizes (see lib/floatAdjustedCap.ts): equal to raw cap for almost every
 * ticker, float-adjusted only for Manulife and Sun Life. Before float-adjusting
 * existed, sorting the board by size put those two on top of SM and BDO here
 * while /rankings had them at #65 and #49, which read as one of the two pages
 * being broken.
 */
export function buildScreenerRows(
  quotes: Quote[],
  yieldByTicker: Map<string, number | null>,
  /** Prebuilt so this stays a dumb join: the ratio math and every rule about
   * when to withhold one live in lib/valuation.ts, where they are tested. */
  valuationByTicker: Map<string, Valuation> = new Map()
): ScreenerRow[] {
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
    peRatio: valuationByTicker.get(q.ticker)?.peRatio ?? null,
    pbRatio: valuationByTicker.get(q.ticker)?.pbRatio ?? null,
  }));
}

/**
 * The full-board screener: same DB-or-mock quotes the market map shows (no
 * separate "sample data" caveat for parity with the homepage), enriched with
 * the dividend yield already computed by getDividendScreener. Both underlying
 * sources keep their own fallback contract, so this never throws on a missing DB.
 */
export async function getScreener(): Promise<ScreenerRow[]> {
  // getCompanyFinancials is an unstable_cache'd whole-table read shared with
  // every /stocks/[ticker] page, so joining it in here costs no extra query.
  const [quotes, dividends, financials] = await Promise.all([
    getDailyQuotes(),
    getDividendScreener(),
    getCompanyFinancials(),
  ]);
  const yieldByTicker = new Map(dividends.rows.map((r) => [r.ticker, r.yieldPct]));

  const valuationByTicker = new Map<string, Valuation>();
  for (const q of quotes) {
    const f = financials[q.ticker];
    if (!f) continue;
    valuationByTicker.set(
      q.ticker,
      computeValuation({
        currencyUnit: f.currencyUnit,
        price: q.price,
        marketCap: q.marketCap,
        epsBasic: f.earningsPerShareBasic.current,
        bookValuePerShare: f.bookValuePerShare.current,
        netIncomeAttributableToParent: f.netIncomeAttributableToParent.current,
        netIncomeAfterTax: f.netIncomeAfterTax.current,
        stockholdersEquityParent: f.stockholdersEquityParent.current,
        stockholdersEquity: f.stockholdersEquity.current,
      })
    );
  }

  return buildScreenerRows(quotes, yieldByTicker, valuationByTicker);
}
