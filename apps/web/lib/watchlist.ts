"use client";

import { useSyncExternalStore } from "react";

/**
 * Anonymous, no-backend watchlist — tickers a visitor has starred, kept in
 * localStorage only. Lets returning visitors get a personalized view (a
 * retention lever) without needing accounts/auth, matching this project's
 * "free, community-first" scope (no user data ever leaves the browser).
 */
const STORAGE_KEY = "pseye:watchlist";

/** Fired after every write so useSyncExternalStore knows to re-read localStorage
 * — plain localStorage writes don't dispatch any event on their own, same
 * reasoning as the ?filter=/?ticker= URL sync in MarketMap.tsx/TreemapChart.tsx. */
const CHANGE_EVENT = "pseye:watchlistchange";

const EMPTY_TICKERS: string[] = [];

// useSyncExternalStore compares snapshots by reference (Object.is) — parsing
// localStorage fresh on every call would return a new array each time even
// when nothing changed, which React reads as "the store changed" on every
// check and re-renders forever. Cache against the raw string so repeated
// calls between actual writes return the same array reference.
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

function writeTickers(tickers: string[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tickers));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function toggleWatched(ticker: string): void {
  const current = readTickers();
  const next = current.includes(ticker) ? current.filter((t) => t !== ticker) : [...current, ticker];
  writeTickers(next);
}

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback); // cross-tab sync
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/** Server snapshot is always an empty list — matches the URL-sync components'
 * approach of defaulting to a value that never mismatches hydration, since
 * localStorage isn't available during SSR. Returns the same cached reference
 * every call, not a fresh `[]` literal — see readTickers' comment above. */
function emptySnapshot(): string[] {
  return EMPTY_TICKERS;
}

export function useWatchlist(): { tickers: string[]; isWatched: (ticker: string) => boolean; toggle: (ticker: string) => void } {
  const tickers = useSyncExternalStore(subscribe, readTickers, emptySnapshot);
  return {
    tickers,
    isWatched: (ticker: string) => tickers.includes(ticker),
    toggle: toggleWatched,
  };
}
