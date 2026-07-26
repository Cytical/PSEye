"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "pseye-colorblind-mode";

/** Fired after every write so useColorblindMode knows to re-read localStorage
 * — plain writes don't dispatch any event on their own, same reasoning as
 * the watchlist/theme localStorage hooks. */
const CHANGE_EVENT = "pseye:colorblindmodechange";

function readColorblindMode(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY) === "1";
}

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback); // cross-tab sync
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

/** Server snapshot is always `false` — matches every other localStorage-backed
 * hook's hydration-safe default (see useWatchlist), since localStorage isn't
 * available during SSR. */
function serverSnapshot(): boolean {
  return false;
}

export function setColorblindMode(enabled: boolean): void {
  window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

/**
 * Market-map-scoped, matching finviz's own "Colorblind Mode" checkbox
 * (confirmed live: it swaps their map's red/green scale for orange/blue and
 * leaves everything else on the site alone) — deliberately not a sitewide
 * override of --up/--down, which would ripple into every gain/loss figure
 * across the site (TopMovers, stock pages, sparklines, MarketSummaryBar...)
 * well beyond what a map-specific toggle implies.
 */
export function useColorblindMode(): boolean {
  return useSyncExternalStore(subscribe, readColorblindMode, serverSnapshot);
}
