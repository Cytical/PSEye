import { PSEI_TICKERS } from "@pseye/source-quotes";

export type MarketMapFilter = "all" | "psei" | "top50" | "top100" | "nasdaq100";

export const MARKET_MAP_FILTERS: { key: MarketMapFilter; label: string }[] = [
  { key: "all", label: "All PSE" },
  { key: "psei", label: "PSEi" },
  { key: "top50", label: "Top 50 PSE" },
  { key: "top100", label: "Top 100 PSE" },
  { key: "nasdaq100", label: "Nasdaq 100" },
];

const PSEI_TICKER_SET = new Set(PSEI_TICKERS);

/**
 * Filters the PSE stock list for every option except "nasdaq100", which swaps
 * in an entirely different dataset (see NASDAQ_100_STOCKS in
 * apps/web/lib/nasdaq100.ts) rather than filtering these — MarketMap.tsx
 * handles that dataset switch, not this function.
 */
export function filterMarketMapStocks<T extends { ticker: string; marketCap: number }>(
  stocks: T[],
  filter: MarketMapFilter
): T[] {
  if (filter === "all" || filter === "nasdaq100") return stocks;
  if (filter === "psei") return stocks.filter((s) => PSEI_TICKER_SET.has(s.ticker));

  const byMarketCapDesc = [...stocks].sort((a, b) => b.marketCap - a.marketCap);
  return filter === "top50" ? byMarketCapDesc.slice(0, 50) : byMarketCapDesc.slice(0, 100);
}
