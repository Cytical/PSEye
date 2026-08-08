"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

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

/** Idempotent add, used by usePortfolioHoldings.ts to star a ticker the moment
 * it's bought — unlike toggleWatched this never removes, so it's safe to call
 * on every portfolio upsert (including edits to an existing holding) without
 * un-starring anything. No-ops (and skips the write/event) when every ticker
 * is already watched. */
export function addWatched(tickers: string[]): void {
  const current = readTickers();
  const toAdd = tickers.filter((t) => !current.includes(t));
  if (toAdd.length === 0) return;
  writeTickers([...current, ...toAdd]);
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

/**
 * Whether the browser has taken over from the server-rendered markup.
 *
 * Lives here because this store is the reason it's needed: the server snapshot
 * above is always an empty list, so any UI that distinguishes "no starred
 * stocks" from "we don't know yet" has to wait for hydration or it will flash
 * an empty state at every visitor who has a watchlist.
 *
 * Deliberately NOT useSyncExternalStore, unlike everything else in this file.
 * Two variants of it were tried and both left /watchlist stuck on its skeleton
 * forever, with no error and no warning: the no-op-subscribe one-liner, and a
 * real store that flipped a module flag in `subscribe` and notified its
 * listeners. In both, the server snapshot stuck and the component never
 * re-rendered, while a plain effect in the same component provably did run.
 * Whatever the cause, an effect is the mechanism that actually works here.
 *
 * The setState is deferred to a microtask rather than called in the effect
 * body only to satisfy the "no setState synchronously in an effect" lint rule
 * (cascading renders). One extra microtask before the skeleton swaps for real
 * content is not perceptible.
 */
export function useIsHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (!cancelled) setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return hydrated;
}

export function useWatchlist(): { tickers: string[]; isWatched: (ticker: string) => boolean; toggle: (ticker: string) => void } {
  const tickers = useSyncExternalStore(subscribe, readTickers, emptySnapshot);
  return {
    tickers,
    isWatched: (ticker: string) => tickers.includes(ticker),
    toggle: toggleWatched,
  };
}
