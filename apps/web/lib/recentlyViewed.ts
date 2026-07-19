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

const EMPTY_TICKERS: string[] = [];

// useSyncExternalStore compares snapshots by reference — see the identical
// comment in lib/watchlist.ts's readTickers for why this must be cached
// against the raw string rather than re-parsed fresh on every call.
let cachedRaw: string | null = null;
let cachedTickers: string[] = EMPTY_TICKERS;

function readTickers(): string[] {
  if (typeof window === "undefined") return EMPTY_TICKERS;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedTickers;
  cachedRaw = raw;
  try {
    if (!raw) {
      cachedTickers = EMPTY_TICKERS;
    } else {
      const parsed = JSON.parse(raw);
      cachedTickers = Array.isArray(parsed)
        ? parsed.filter((t): t is string => typeof t === "string")
        : EMPTY_TICKERS;
    }
  } catch {
    cachedTickers = EMPTY_TICKERS;
  }
  return cachedTickers;
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
  return EMPTY_TICKERS;
}

export function useRecentlyViewed(excludeTicker?: string): string[] {
  const tickers = useSyncExternalStore(subscribe, readTickers, emptySnapshot);
  return excludeTicker ? tickers.filter((t) => t !== excludeTicker) : tickers;
}
