"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PSE_EDGE_COMPANIES } from "@pseye/source-quotes";
import { useWatchlist } from "@/lib/watchlist";

const MAX_RESULTS = 8;

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface AddToWatchlistModalProps {
  onClose: () => void;
}

/**
 * Search modal for bookmarking stocks straight from the market map's "My
 * Watchlist" filter, rather than requiring a visitor switch to "All PSE" and
 * star each one from the detail panel — the only other way in before this.
 * Stays open across multiple picks (toggling, not navigating) since the
 * point is bookmarking several at once. Same dialog/focus-trap shape as
 * CompanyDetailPanel.tsx.
 */
export function AddToWatchlistModal({ onClose }: AddToWatchlistModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const { isWatched, toggle } = useWatchlist();

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    inputRef.current?.focus();

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

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool =
      q.length === 0
        ? PSE_EDGE_COMPANIES
        : PSE_EDGE_COMPANIES.filter(
            (c) => c.ticker.toLowerCase().includes(q) || c.companyName.toLowerCase().includes(q)
          );
    return pool.slice(0, MAX_RESULTS);
  }, [query]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-watchlist-heading"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[80vh] w-full max-w-sm flex-col overflow-hidden rounded-xl bg-panel text-panel-fg ring-1 ring-panel-border shadow-2xl outline-none"
      >
        <div className="flex items-center justify-between gap-3 border-b border-panel-border p-4">
          <h2 id="add-watchlist-heading" className="text-sm font-bold tracking-tight">
            Add to watchlist
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1 text-panel-fg/50 transition-colors hover:bg-panel-raised hover:text-panel-fg"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-4 pb-2">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search ticker or company…"
            aria-label="Search PSE stocks by ticker or company name"
            className="w-full rounded-md border border-panel-border bg-[var(--background)] px-2.5 py-1.5 text-sm text-panel-fg placeholder:text-panel-fg/40"
          />
        </div>

        <ul className="flex-1 overflow-y-auto px-2 pb-3 pt-1">
          {results.map((c) => {
            const watched = isWatched(c.ticker);
            return (
              <li key={c.ticker}>
                <button
                  type="button"
                  onClick={() => toggle(c.ticker)}
                  aria-pressed={watched}
                  className="flex w-full items-center justify-between gap-2 rounded-md px-2.5 py-2 text-left text-sm transition-colors hover:bg-panel-raised"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <span className="shrink-0 rounded bg-panel-raised px-1.5 py-0.5 font-mono text-[10px]">{c.ticker}</span>
                    <span className="truncate">{c.companyName}</span>
                  </span>
                  <span
                    className={`shrink-0 text-xs font-medium ${watched ? "text-[#f5b400]" : "text-panel-fg/40"}`}
                  >
                    {watched ? "★ Added" : "+ Add"}
                  </span>
                </button>
              </li>
            );
          })}
          {results.length === 0 && (
            <li className="px-2.5 py-6 text-center text-sm text-panel-fg/50">No matching stocks.</li>
          )}
        </ul>
      </div>
    </div>
  );
}
