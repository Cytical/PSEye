export type Theme = "light" | "dark";

export const THEME_STORAGE_KEY = "pseye-theme";

/** Fired after every theme change so useColorTheme (./useColorTheme.ts) knows
 * to re-read the DOM attribute — plain dataset writes don't dispatch any
 * event on their own, same reasoning as the ?filter=/?ticker= URL sync in
 * MarketMap.tsx. Exported (not module-private) so that hook, which lives in
 * its own "use client" file to keep this file safely importable from the
 * Server Component layout.tsx (THEME_INIT_SCRIPT below), can subscribe. */
export const THEME_CHANGE_EVENT = "pseye:themechange";

/** Applies a theme to <html>: data-theme drives CSS variables (background/
 * foreground), and the `dark` class drives Tailwind's `dark:` utilities
 * (see the @custom-variant in globals.css). */
export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle("dark", theme === "dark");
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT));
}

/** Source used by the pre-hydration inline script in layout.tsx — kept as a
 * plain string (not imported) since that script runs before any bundle
 * loads. Must be kept in sync with the logic above by hand.
 *
 * A first-time visitor (no stored choice yet) gets whatever their OS/browser
 * already prefers, via `prefers-color-scheme` — not a hardcoded default in
 * either direction. An explicit stored choice (light or dark, set by
 * ThemeToggle) always wins over the system preference. `classList.toggle`
 * (not a one-directional `add`) so a light system preference actually
 * removes the `dark` class the server-rendered <html> ships with by
 * default — a plain `if (theme === "dark") add("dark")` would leave that
 * class stuck on for light-themed visitors instead of clearing it. */
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("${THEME_STORAGE_KEY}");
    var theme = stored === "light" || stored === "dark"
      ? stored
      : (window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle("dark", theme === "dark");
  } catch (e) {}
})();
`;
