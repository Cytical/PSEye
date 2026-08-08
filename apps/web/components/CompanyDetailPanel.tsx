"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import type { TreemapStock } from "./TreemapChart";
import type { CompanyProfile } from "@/lib/companyProfiles";
import { WatchlistStarButton } from "./WatchlistStarButton";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface CompanyDetailPanelProps {
  stock: TreemapStock;
  /** Full DB-backed profile for PSE stocks, or just description/source for
   * datasets with no profileByTicker entry (see TreemapChart's Nasdaq 100
   * fallback) — this panel only ever reads those two fields. */
  profile: Pick<CompanyProfile, "description" | "source"> | null;
  /**
   * 1-based position by investableMarketCap among the stocks currently shown
   * (respects the active filter) — the same size the treemap draws boxes
   * with, see lib/floatAdjustedCap.ts (market cap for almost every ticker,
   * float-adjusted only for MFC/SLF). Null only if the selected ticker
   * somehow isn't in the ranked set, which the rank line then omits rather
   * than guessing.
   */
  rank: number | null;
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
  const dialogRef = useRef<HTMLDivElement>(null);

  // Moves focus into the dialog on open and back to whatever triggered it
  // (the treemap box button) on close, and traps Tab/Shift+Tab within the
  // dialog while it's open — without this, a keyboard/screen-reader user
  // could Tab straight through into the treemap/page chrome sitting behind
  // the overlay, making this only a *visual* modal.
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  const currency = stock.currency ?? "PHP";
  const symbol = currency === "USD" ? "$" : "₱";
  // A missing % change renders as flat 0.00%, not "N/A" — see pctChangeToColor
  // in @pseye/treemap-layout for why. Price keeps its own null handling: an
  // unknown price is genuinely unknown, and "₱0.00" would be a false quote.
  const changeColor = (stock.pctChange ?? 0) >= 0 ? "text-up" : "text-down";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-overlay-backdrop"
      onClick={onClose}
      role="presentation"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="company-detail-heading"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-xl bg-panel text-panel-fg ring-1 ring-panel-border shadow-2xl outline-none animate-overlay-panel"
      >
        <div className="flex items-start justify-between gap-3 border-b border-panel-border p-5">
          <div>
            <div className="flex items-baseline gap-2">
              <h2 id="company-detail-heading" className="font-serif text-xl font-semibold tracking-tight">
                {stock.ticker}
              </h2>
              <span className="text-[10px] uppercase tracking-wide text-panel-fg/72">{stock.sector}</span>
            </div>
            <div className="mt-0.5 text-sm text-panel-fg/70">{stock.companyName}</div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {currency !== "USD" && <WatchlistStarButton ticker={stock.ticker} size={18} />}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="rounded-md p-1 text-panel-fg/68 transition-colors hover:bg-panel-raised hover:text-panel-fg"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-4 overflow-y-auto p-5">
          <div className="flex items-end justify-between">
            <div>
              <div className="font-serif text-2xl font-semibold tabular-nums">
                {stock.price == null ? "N/A" : `${symbol}${stock.price.toFixed(2)}`}
              </div>
              <div className={`text-sm font-semibold ${changeColor}`}>
                {`${(stock.pctChange ?? 0) >= 0 ? "+" : ""}${(stock.pctChange ?? 0).toFixed(2)}% today`}
              </div>
            </div>
            <div className="text-right text-xs text-panel-fg/68">
              <div>Market cap</div>
              <div className="font-semibold text-panel-fg/80">{formatMarketCap(stock.marketCap, currency)}</div>
              <div className="mt-1">
                {rank == null ? "" : `#${rank} of ${totalCount} shown`}
              </div>
            </div>
          </div>

          <div>
            <div className="kicker text-panel-fg/72">About</div>
            {profile == null ? (
              <p className="mt-2 text-sm text-panel-fg/68">No company description yet for {stock.ticker}.</p>
            ) : (
              <>
                {/* Only the first paragraph — a summary, not the full profile — so
                    this stays a quick-glance panel; the rest lives on the ticker
                    page behind "See more". */}
                <p className="mt-2 text-sm leading-snug text-panel-fg/80">
                  {profile.description.split("\n\n")[0]}
                </p>
                <div className="mt-2.5 text-[11px] text-panel-fg/72">{profile.source}</div>
              </>
            )}
          </div>
        </div>

        {/* The one thing this panel exists to hand off to, so it gets the
            accent fill and a pinned bar of its own rather than sitting as the
            last muted text link at the bottom of the scroll area, where on a
            short viewport it was below the fold entirely. White ink on the
            light theme's --accent measures 5.83:1; the dark theme's --accent is
            a bright green, so it flips to the near-black page ink (10.8:1)
            instead of keeping white, which would be unreadable. */}
        {currency !== "USD" && (
          <div className="shrink-0 border-t border-panel-border p-4">
            <Link
              href={`/stocks/${stock.ticker}`}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 dark:text-background"
            >
              See more on {stock.ticker}
              <span aria-hidden="true">→</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
