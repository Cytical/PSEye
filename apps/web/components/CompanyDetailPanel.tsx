"use client";

import { useEffect } from "react";
import type { TreemapStock } from "./TreemapChart";
import type { CompanyProfile } from "@/lib/companyProfiles";

interface CompanyDetailPanelProps {
  stock: TreemapStock;
  profile: CompanyProfile | null;
  /** 1-based position by market cap among the stocks currently shown (respects the active filter). */
  rank: number;
  totalCount: number;
  onClose: () => void;
}

function formatMarketCap(marketCap: number, currency: "PHP" | "USD"): string {
  const symbol = currency === "USD" ? "$" : "₱";
  if (marketCap >= 1e12) return `${symbol}${(marketCap / 1e12).toFixed(2)}T`;
  if (marketCap >= 1e9) return `${symbol}${(marketCap / 1e9).toFixed(1)}B`;
  if (marketCap >= 1e6) return `${symbol}${(marketCap / 1e6).toFixed(1)}M`;
  return `${symbol}${marketCap.toFixed(0)}`;
}

export function CompanyDetailPanel({ stock, profile, rank, totalCount, onClose }: CompanyDetailPanelProps) {
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  const currency = stock.currency ?? "PHP";
  const symbol = currency === "USD" ? "$" : "₱";
  const changeColor =
    stock.pctChange == null ? "text-panel-fg/50" : stock.pctChange >= 0 ? "text-[#30cc5a]" : "text-[#f6362f]";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="company-detail-heading"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-sm flex-col overflow-hidden rounded-xl bg-panel text-panel-fg ring-1 ring-panel-border shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-panel-border p-5">
          <div>
            <div className="flex items-baseline gap-2">
              <h2 id="company-detail-heading" className="text-lg font-bold tracking-tight">
                {stock.ticker}
              </h2>
              <span className="text-[10px] uppercase tracking-wide text-panel-fg/40">{stock.sector}</span>
            </div>
            <div className="mt-0.5 text-sm text-panel-fg/70">{stock.companyName}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-md p-1 text-panel-fg/50 transition-colors hover:bg-panel-raised hover:text-panel-fg"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto p-5">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-2xl font-bold">
                {stock.price == null ? "N/A" : `${symbol}${stock.price.toFixed(2)}`}
              </div>
              <div className={`text-sm font-semibold ${changeColor}`}>
                {stock.pctChange == null
                  ? "N/A"
                  : `${stock.pctChange >= 0 ? "+" : ""}${stock.pctChange.toFixed(2)}% today`}
              </div>
            </div>
            <div className="text-right text-xs text-panel-fg/50">
              <div>Market cap</div>
              <div className="font-semibold text-panel-fg/80">{formatMarketCap(stock.marketCap, currency)}</div>
              <div className="mt-1">
                #{rank} of {totalCount} shown
              </div>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wide text-panel-fg/40">About</div>
            {profile == null ? (
              <p className="mt-2 text-sm text-panel-fg/50">No company description yet for {stock.ticker}.</p>
            ) : (
              <>
                <div className="mt-2 flex flex-col gap-2.5">
                  {profile.description.split("\n\n").map((paragraph, i) => (
                    <p key={i} className="text-sm leading-snug text-panel-fg/80">
                      {paragraph}
                    </p>
                  ))}
                </div>
                <div className="mt-2.5 text-[11px] text-panel-fg/40">{profile.source}</div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
