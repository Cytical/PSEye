"use client";

import { useMemo, useState } from "react";
import { TreemapChart, type TreemapStock } from "./TreemapChart";
import { MARKET_MAP_FILTERS, filterMarketMapStocks, type MarketMapFilter } from "@/lib/marketMapFilters";
import { NASDAQ_100_STOCKS } from "@/lib/nasdaq100";

interface MarketMapProps {
  stocks: TreemapStock[];
}

export function MarketMap({ stocks }: MarketMapProps) {
  const [filter, setFilter] = useState<MarketMapFilter>("all");
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
              onClick={() => setFilter(option.key)}
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
        <TreemapChart stocks={filteredStocks} />
      </div>
    </div>
  );
}
