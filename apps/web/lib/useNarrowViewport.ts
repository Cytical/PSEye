"use client";

import { useSyncExternalStore } from "react";

/** Tailwind's `sm` breakpoint, expressed as its complement — the same 640px
 * boundary every `sm:` utility in the market map keys off, so the JS-side
 * "is this a phone?" answer can never drift from the CSS-side one. */
const NARROW_QUERY = "(max-width: 639px)";

function subscribe(callback: () => void) {
  const mq = window.matchMedia(NARROW_QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function getSnapshot(): boolean {
  return window.matchMedia(NARROW_QUERY).matches;
}

/**
 * True on phone-width viewports.
 *
 * Server-snapshots to `false` so SSR and the first client render agree; React
 * then re-renders with the real reading immediately after hydration, which is
 * the documented `useSyncExternalStore` contract for a client-only value —
 * same pattern as MarketMap's own `?filter=`/`?date=` URL stores. Reading
 * `matchMedia` in an effect instead would work too, but would render one frame
 * of the wrong layout first.
 */
export function useNarrowViewport(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
