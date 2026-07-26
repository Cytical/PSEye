"use client";

import { useSyncExternalStore } from "react";
import { THEME_CHANGE_EVENT, type Theme } from "./theme";

function readTheme(): Theme {
  return (document.documentElement.dataset.theme as Theme | undefined) ?? "dark";
}

function subscribe(callback: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, callback);
  return () => window.removeEventListener(THEME_CHANGE_EVENT, callback);
}

/**
 * Split out of theme.ts (which layout.tsx, a Server Component, imports for
 * THEME_INIT_SCRIPT) since useSyncExternalStore can't appear anywhere in a
 * Server Component's module graph, even unused at the actual import site.
 *
 * Server snapshot is always "dark" — matches <html data-theme="dark"> in
 * layout.tsx, so hydration never mismatches a client whose pre-hydration
 * script already flipped to light (an explicit stored choice — dark is the
 * unconditional default, see THEME_INIT_SCRIPT); the real value is picked up
 * in the client-only re-render right after mount, same pattern as
 * useWatchlist. Needed by any component whose colors are computed in JS
 * rather than following the --panel-* CSS variables for free (e.g.
 * TreemapChart's data-driven box fills).
 */
export function useColorTheme(): Theme {
  return useSyncExternalStore(subscribe, readTheme, (): Theme => "dark");
}
