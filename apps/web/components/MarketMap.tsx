"use client";

import { useMemo, useSyncExternalStore } from "react";
import { TreemapChart, type TreemapStock } from "./TreemapChart";
import { MARKET_MAP_FILTERS, filterMarketMapStocks, type MarketMapFilter } from "@/lib/marketMapFilters";
import { NASDAQ_100_STOCKS } from "@/lib/nasdaq100";
import type { CompanyProfile } from "@/lib/companyProfiles";

interface MarketMapProps {
  stocks: TreemapStock[];
  /** Ticker -> one-time-fetched company description, pre-fetched once server-side so the click-to-detail panel never waits on a network request. */
  profileByTicker?: Record<string, CompanyProfile>;
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
export function MarketMap({ stocks, profileByTicker }: MarketMapProps) {
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

  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      <nav
        className="flex shrink-0 gap-2 overflow-x-auto rounded-lg bg-[#12141a] p-2 ring-1 ring-white/10 sm:w-44 sm:flex-col sm:gap-1 sm:overflow-visible"
        aria-label="Market map filters"
      >
        <span className="hidden px-2 pb-1 text-[10px] font-semibold uppercase tracking-wide text-white/35 sm:block">
          Filters
        </span>
        {MARKET_MAP_FILTERS.map((option) => {
          const isActive = option.key === filter;
          return (
            <button
              key={option.key}
              type="button"
              onClick={() => selectFilter(option.key)}
              aria-pressed={isActive}
              className={`relative whitespace-nowrap rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                isActive
                  ? "bg-[#2b3543] text-white before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-[#30cc5a] before:content-['']"
                  : "text-white/55 hover:bg-[#1c212b] hover:text-white"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </nav>

      <div className="min-w-0 flex-1">
        <TreemapChart stocks={filteredStocks} profileByTicker={profileByTicker} />
      </div>
    </div>
  );
}
