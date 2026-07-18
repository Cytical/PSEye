"use client";

import { useMemo, useSyncExternalStore } from "react";
import { TreemapChart, type TreemapStock } from "./TreemapChart";
import { MarketSummaryBar } from "./MarketSummaryBar";
import { TopMovers } from "./TopMovers";
import { MARKET_MAP_FILTERS, filterMarketMapStocks, type MarketMapFilter } from "@/lib/marketMapFilters";
import { NASDAQ_100_STOCKS } from "@/lib/nasdaq100";
import type { CompanyProfile } from "@/lib/companyProfiles";
import type { MarketSnapshot } from "@/lib/marketSnapshot";
import type { LatestForeignFlow } from "@/lib/latestForeignFlow";

interface MarketMapProps {
  stocks: TreemapStock[];
  /** Ticker -> one-time-fetched company description, pre-fetched once server-side so the click-to-detail panel never waits on a network request. */
  profileByTicker?: Record<string, CompanyProfile>;
  snapshot: MarketSnapshot;
  foreignFlow: LatestForeignFlow;
}

const FILTER_KEYS = new Set(MARKET_MAP_FILTERS.map((f) => f.key));

/** Fired after history.replaceState so useSyncExternalStore knows to re-read the URL
 * (replaceState doesn't dispatch popstate on its own). */
const FILTER_CHANGE_EVENT = "pseye:filterchange";

function subscribeToFilterUrl(callback: () => void) {
  window.addEventListener(FILTER_CHANGE_EVENT, callback);
  window.addEventListener("popstate", callback);
  return () => {
    window.removeEventListener(FILTER_CHANGE_EVENT, callback);
    window.removeEventListener("popstate", callback);
  };
}

function getFilterFromUrl(): MarketMapFilter {
  const param = new URLSearchParams(window.location.search).get("filter");
  return param && FILTER_KEYS.has(param as MarketMapFilter) ? (param as MarketMapFilter) : "all";
}

/**
 * Syncs the active filter to the `?filter=` URL param — matches the useColorMode
 * pattern in TreemapChart.tsx (server snapshot "all" so hydration never mismatches
 * a client that might land on a deep-linked, non-default filter).
 */
export function MarketMap({ stocks, profileByTicker, snapshot, foreignFlow }: MarketMapProps) {
  const filter = useSyncExternalStore(subscribeToFilterUrl, getFilterFromUrl, (): MarketMapFilter => "all");

  function selectFilter(next: MarketMapFilter) {
    const url = new URL(window.location.href);
    if (next === "all") url.searchParams.delete("filter");
    else url.searchParams.set("filter", next);
    window.history.replaceState(null, "", url);
    window.dispatchEvent(new Event(FILTER_CHANGE_EVENT));
  }

  const filteredStocks = useMemo(
    () => (filter === "nasdaq100" ? NASDAQ_100_STOCKS : filterMarketMapStocks(stocks, filter)),
    [stocks, filter]
  );

  /** Stock count per filter, shown as a badge so the choice between e.g. "Top 50" and "Top 100" is informed rather than a guess. */
  const countByFilter = useMemo((): Record<MarketMapFilter, number> => {
    const counts = {} as Record<MarketMapFilter, number>;
    for (const { key } of MARKET_MAP_FILTERS) {
      counts[key] = key === "nasdaq100" ? NASDAQ_100_STOCKS.length : filterMarketMapStocks(stocks, key).length;
    }
    return counts;
  }, [stocks]);

  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <nav
        className="flex shrink-0 flex-col gap-2 overflow-x-auto rounded-lg bg-panel p-2 ring-1 ring-panel-border sm:sticky sm:top-4 sm:w-48 sm:gap-0.5 sm:self-start sm:overflow-visible"
        aria-label="Market map filters"
      >
        <span className="hidden border-b border-panel-border px-2 pb-2 text-[10px] font-semibold uppercase tracking-wide text-panel-fg/35 sm:block">
          Filters
        </span>
        <div className="flex gap-2 sm:flex-col sm:gap-0.5">
          {MARKET_MAP_FILTERS.map((option) => {
            const isActive = option.key === filter;
            return (
              <button
                key={option.key}
                type="button"
                onClick={() => selectFilter(option.key)}
                aria-pressed={isActive}
                className={`group relative flex items-center justify-between gap-3 whitespace-nowrap rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-panel-active text-panel-fg before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-[#30cc5a] before:content-['']"
                    : "text-panel-fg/55 hover:bg-panel-raised hover:text-panel-fg"
                }`}
              >
                <span>{option.label}</span>
                <span
                  className={`text-[11px] tabular-nums transition-colors ${
                    isActive ? "text-panel-fg/50" : "text-panel-fg/25 group-hover:text-panel-fg/40"
                  }`}
                >
                  {countByFilter[option.key]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="border-t border-panel-border pt-2">
          <MarketSummaryBar snapshot={snapshot} foreignFlow={foreignFlow} />
        </div>

        <div className="border-t border-panel-border pt-2">
          <TopMovers quotes={stocks} />
        </div>
      </nav>

      <div className="min-w-0 flex-1">
        <TreemapChart stocks={filteredStocks} profileByTicker={profileByTicker} />
      </div>
    </div>
  );
}
