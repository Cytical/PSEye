"use client";

import { useSyncExternalStore } from "react";
import type { Holding } from "./portfolio";

/**
 * Anonymous, no-backend portfolio — same localStorage-only contract as
 * watchlist.ts (no user data ever leaves the browser), just storing
 * shares/avg-cost per ticker instead of a bare starred list.
 */
const STORAGE_KEY = "pseye:portfolio";
const CHANGE_EVENT = "pseye:portfoliochange";

const EMPTY_HOLDINGS: Holding[] = [];

// Same reference-cache-against-raw-string trick as watchlist.ts's readTickers —
// useSyncExternalStore compares snapshots with Object.is, so a fresh parse on
// every call would look like a change on every render and loop forever.
let cachedRaw: string | null = null;
let cachedHoldings: Holding[] = EMPTY_HOLDINGS;

function isHolding(v: unknown): v is Holding {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as Holding).ticker === "string" &&
    typeof (v as Holding).shares === "number" &&
    typeof (v as Holding).avgCost === "number"
  );
}

function readHoldings(): Holding[] {
  if (typeof window === "undefined") return EMPTY_HOLDINGS;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedHoldings;
  cachedRaw = raw;
  try {
    if (!raw) {
      cachedHoldings = EMPTY_HOLDINGS;
    } else {
      const parsed = JSON.parse(raw);
      cachedHoldings = Array.isArray(parsed) ? parsed.filter(isHolding) : EMPTY_HOLDINGS;
    }
  } catch {
    cachedHoldings = EMPTY_HOLDINGS;
  }
  return cachedHoldings;
}

function writeHoldings(holdings: Holding[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(holdings));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function upsertHolding(ticker: string, shares: number, avgCost: number): void {
  const current = readHoldings();
  const next = current.filter((h) => h.ticker !== ticker);
  next.push({ ticker, shares, avgCost });
  writeHoldings(next);
}

function removeHolding(ticker: string): void {
  writeHoldings(readHoldings().filter((h) => h.ticker !== ticker));
}

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback); // cross-tab sync
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/** Server snapshot is always empty — same hydration-safety reasoning as
 * watchlist.ts's emptySnapshot (localStorage doesn't exist during SSR). */
function emptySnapshot(): Holding[] {
  return EMPTY_HOLDINGS;
}

export function usePortfolioHoldings(): {
  holdings: Holding[];
  upsert: (ticker: string, shares: number, avgCost: number) => void;
  remove: (ticker: string) => void;
} {
  const holdings = useSyncExternalStore(subscribe, readHoldings, emptySnapshot);
  return { holdings, upsert: upsertHolding, remove: removeHolding };
}
