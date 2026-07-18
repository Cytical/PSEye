"use client";

import { useSyncExternalStore } from "react";

/**
 * Anonymous, localStorage-only "recently viewed" tickers — same no-backend
 * contract as watchlist.ts. Gives a visitor already engaged with one stock
 * page a one-click path back to others they looked at, encouraging more
 * pages-per-session rather than a single-page bounce.
 */
const STORAGE_KEY = "pseye:recently-viewed";
const CHANGE_EVENT = "pseye:recentlyviewedchange";
const MAX_ITEMS = 6;

function readTickers(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === "string") : [];
  } catch {
    return [];
  }
}

export function recordView(ticker: string): void {
  const next = [ticker, ...readTickers().filter((t) => t !== ticker)].slice(0, MAX_ITEMS);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function emptySnapshot(): string[] {
  return [];
}

export function useRecentlyViewed(excludeTicker?: string): string[] {
  const tickers = useSyncExternalStore(subscribe, readTickers, emptySnapshot);
  return excludeTicker ? tickers.filter((t) => t !== excludeTicker) : tickers;
}
