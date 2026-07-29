import { PSEI_TICKERS } from "@pseye/source-quotes";
import { byInvestableCapDesc } from "./floatAdjustedCap";

export type MarketMapFilter = "all" | "psei" | "top30" | "top50" | "top100" | "nasdaq100" | "watchlist";

export const MARKET_MAP_FILTERS: { key: MarketMapFilter; label: string }[] = [
  { key: "all", label: "All PSE" },
  { key: "psei", label: "PSEi" },
  { key: "top30", label: "Top 30 PSE" },
  { key: "top50", label: "Top 50 PSE" },
  { key: "top100", label: "Top 100 PSE" },
  { key: "nasdaq100", label: "Nasdaq 100" },
  { key: "watchlist", label: "My Watchlist" },
];

/**
 * What the map falls back to on phone-width viewports when the URL names no
 * filter (see MarketMap.tsx). "All PSE" is ~280 boxes; on a 390px-wide screen
 * that leaves each tile a couple of millimetres across — not readable, and
 * well under the ~44px minimum tap target. Desktop keeps "All PSE" as its
 * default, and either default is one tap away from the other.
 */
export const NARROW_DEFAULT_FILTER: MarketMapFilter = "top30";

const PSEI_TICKER_SET = new Set(PSEI_TICKERS);

/** How many stocks each market-cap-ranked filter keeps. */
const TOP_N: Partial<Record<MarketMapFilter, number>> = {
  top30: 30,
  top50: 50,
  top100: 100,
};

/**
 * Filters the PSE stock list for every option except "nasdaq100" (swaps in an
 * entirely different dataset, see NASDAQ_100_STOCKS in apps/web/lib/nasdaq100.ts)
 * and "watchlist" (needs the visitor's localStorage-only starred tickers,
 * which this pure function has no access to) — MarketMap.tsx special-cases
 * both of those itself rather than filtering here.
 */
export function filterMarketMapStocks<
  // freeFloatPct is in the constraint, not just tolerated structurally, so a
  // caller passing a stock shape without it gets raw-cap ordering by explicit
  // opt-out rather than by silent omission.
  T extends { ticker: string; marketCap: number; freeFloatPct?: number | null },
>(
  stocks: T[],
  filter: MarketMapFilter
): T[] {
  if (filter === "all" || filter === "nasdaq100" || filter === "watchlist") return stocks;
  if (filter === "psei") return stocks.filter((s) => PSEI_TICKER_SET.has(s.ticker));

  const limit = TOP_N[filter];
  if (limit == null) return stocks;
  // Float-adjusted, matching the size the map already draws these same boxes
  // with (see lib/floatAdjustedCap.ts). On raw cap the two foreign
  // dual-listings took two of the thirty slots and then rendered as slivers,
  // because the cut and the sizing disagreed about how big they were.
  return [...stocks].sort(byInvestableCapDesc).slice(0, limit);
}
