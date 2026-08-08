"use client";

import { useMemo, useSyncExternalStore } from "react";
import { computePositions, migrateLegacyEntries, type Transaction, type TransactionType } from "./transactions";
import { addWatched } from "./watchlist";

/**
 * Anonymous, no-backend transaction log — same localStorage-only contract as
 * watchlist.ts (no user data ever leaves the browser). Same storage key as
 * the pre-2026-08-08 single-position schema (`pseye:portfolio`); old entries
 * upgrade transparently on read via migrateLegacyEntries.
 */
const STORAGE_KEY = "pseye:portfolio";
const CHANGE_EVENT = "pseye:portfoliochange";

const EMPTY_TRANSACTIONS: Transaction[] = [];

// Same reference-cache-against-raw-string trick as watchlist.ts's readTickers —
// useSyncExternalStore compares snapshots with Object.is, so a fresh parse on
// every call would look like a change on every render and loop forever.
let cachedRaw: string | null = null;
let cachedTransactions: Transaction[] = EMPTY_TRANSACTIONS;

function readTransactions(): Transaction[] {
  if (typeof window === "undefined") return EMPTY_TRANSACTIONS;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedTransactions;
  cachedRaw = raw;
  try {
    if (!raw) {
      cachedTransactions = EMPTY_TRANSACTIONS;
    } else {
      const parsed = JSON.parse(raw);
      cachedTransactions = Array.isArray(parsed) ? migrateLegacyEntries(parsed) : EMPTY_TRANSACTIONS;
    }
  } catch {
    cachedTransactions = EMPTY_TRANSACTIONS;
  }
  return cachedTransactions;
}

function writeTransactions(transactions: Transaction[]): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function genId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `tx-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export interface NewTransaction {
  ticker: string;
  type: TransactionType;
  shares: number;
  price: number;
  date: string;
}

function addTransactions(inputs: NewTransaction[]): void {
  if (inputs.length === 0) return;
  const current = readTransactions();
  writeTransactions([...current, ...inputs.map((t) => ({ id: genId(), ...t }))]);
  // Buying is a strong enough signal to watch it — one-directional by design,
  // same reasoning as the old usePortfolioHoldings.ts: selling doesn't mean
  // you've stopped wanting to see how it's doing, so a sell never un-stars.
  const boughtTickers = inputs.filter((t) => t.type === "buy").map((t) => t.ticker);
  if (boughtTickers.length > 0) addWatched(boughtTickers);
}

function addTransaction(input: NewTransaction): void {
  addTransactions([input]);
}

function removeTransaction(id: string): void {
  writeTransactions(readTransactions().filter((t) => t.id !== id));
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
function emptySnapshot(): Transaction[] {
  return EMPTY_TRANSACTIONS;
}

export function usePortfolioTransactions() {
  const transactions = useSyncExternalStore(subscribe, readTransactions, emptySnapshot);
  const { positions, realizedGains, totalRealizedGain } = useMemo(() => computePositions(transactions), [transactions]);
  return {
    transactions,
    /** Current derived positions (ticker, shares, weighted-avg cost) — shares > 0 only. */
    positions,
    realizedGains,
    totalRealizedGain,
    addTransaction,
    addTransactions,
    removeTransaction,
  };
}
