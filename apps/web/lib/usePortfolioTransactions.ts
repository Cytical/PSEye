"use client";

import { useMemo, useSyncExternalStore } from "react";
import { computePositions, migrateLegacyEntries, type PositionsResult, type Transaction, type TransactionType } from "./transactions";
import { addWatched } from "./watchlist";

export interface NewTransaction {
  ticker: string;
  type: TransactionType;
  shares: number;
  price: number;
  date: string;
  fee?: number;
}

export interface TransactionStore extends PositionsResult {
  transactions: Transaction[];
  addTransaction: (input: NewTransaction) => void;
  addTransactions: (inputs: NewTransaction[]) => void;
  removeTransaction: (id: string) => void;
  /** Wipes the whole log back to empty — used by practice mode's "reset to
   * ₱100,000" control. Real portfolios have no UI wired to this; deleting a
   * real trade history a row at a time (removeTransaction) is the only path
   * there, deliberately, since that data represents actual money. */
  reset: () => void;
}

/**
 * Builds one independent, localStorage-backed transaction store — same
 * localStorage-only contract as watchlist.ts (no user data ever leaves the
 * browser). Factored out (2026-08-08) so the real portfolio and the practice
 * ("paper trading") portfolio below can each get their own storage key and
 * independent module-level read cache, without duplicating this file.
 */
function createTransactionStore(storageKey: string, changeEvent: string, autoWatchOnBuy: boolean) {
  const EMPTY_TRANSACTIONS: Transaction[] = [];

  // Same reference-cache-against-raw-string trick as watchlist.ts's readTickers —
  // useSyncExternalStore compares snapshots with Object.is, so a fresh parse on
  // every call would look like a change on every render and loop forever.
  let cachedRaw: string | null = null;
  let cachedTransactions: Transaction[] = EMPTY_TRANSACTIONS;

  function readTransactions(): Transaction[] {
    if (typeof window === "undefined") return EMPTY_TRANSACTIONS;
    const raw = window.localStorage.getItem(storageKey);
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
    window.localStorage.setItem(storageKey, JSON.stringify(transactions));
    window.dispatchEvent(new Event(changeEvent));
  }

  function genId(): string {
    return typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `tx-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  function addTransactions(inputs: NewTransaction[]): void {
    if (inputs.length === 0) return;
    const current = readTransactions();
    writeTransactions([...current, ...inputs.map((t) => ({ id: genId(), ...t }))]);
    if (autoWatchOnBuy) {
      // Buying is a strong enough signal to watch it — one-directional by
      // design: selling doesn't mean you've stopped wanting to see how it's
      // doing, so a sell never un-stars. Not done for the practice store
      // (autoWatchOnBuy: false) — a simulated buy shouldn't star a real
      // ticker on the real watchlist and blur play money into real signals.
      const boughtTickers = inputs.filter((t) => t.type === "buy").map((t) => t.ticker);
      if (boughtTickers.length > 0) addWatched(boughtTickers);
    }
  }

  function addTransaction(input: NewTransaction): void {
    addTransactions([input]);
  }

  function removeTransaction(id: string): void {
    writeTransactions(readTransactions().filter((t) => t.id !== id));
  }

  function reset(): void {
    writeTransactions([]);
  }

  function subscribe(callback: () => void) {
    window.addEventListener(changeEvent, callback);
    window.addEventListener("storage", callback); // cross-tab sync
    return () => {
      window.removeEventListener(changeEvent, callback);
      window.removeEventListener("storage", callback);
    };
  }

  /** Server snapshot is always empty — same hydration-safety reasoning as
   * watchlist.ts's emptySnapshot (localStorage doesn't exist during SSR). */
  function emptySnapshot(): Transaction[] {
    return EMPTY_TRANSACTIONS;
  }

  return function useTransactionStore(): TransactionStore {
    const transactions = useSyncExternalStore(subscribe, readTransactions, emptySnapshot);
    const { positions, realizedGains, totalRealizedGain } = useMemo(() => computePositions(transactions), [transactions]);
    return {
      transactions,
      /** Current derived positions (ticker, shares, weighted-avg cost, fees
       * folded in) — shares > 0 only. */
      positions,
      realizedGains,
      totalRealizedGain,
      addTransaction,
      addTransactions,
      removeTransaction,
      reset,
    };
  };
}

/** Same storage key as the pre-2026-08-08 single-position schema
 * (`pseye:portfolio`); old entries upgrade transparently on read via
 * migrateLegacyEntries. */
export const usePortfolioTransactions = createTransactionStore("pseye:portfolio", "pseye:portfoliochange", true);

/** Practice ("paper trading") portfolio — a fully separate transaction log
 * starting from PAPER_STARTING_CASH (lib/paperTrading.ts), simulated against
 * the same real market quotes as the real portfolio. Its own storage key, so
 * it can never merge with or overwrite real holdings. */
export const usePaperPortfolioTransactions = createTransactionStore("pseye:portfolio-paper", "pseye:portfoliopaperchange", false);
