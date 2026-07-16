export type Theme = "light" | "sepia" | "dark";

export const THEME_STORAGE_KEY = "pseye-theme";

export const THEMES: { value: Theme; label: string; swatch: string }[] = [
  { value: "light", label: "Light", swatch: "#ffffff" },
  { value: "sepia", label: "Sepia", swatch: "#fff1e5" },
  { value: "dark", label: "Dark", swatch: "#0a0a0a" },
];

/** Applies a theme to <html>: data-theme drives CSS variables (background/
 * foreground, including the sepia palette), and the `dark` class drives
 * Tailwind's `dark:` utilities (see the @custom-variant in globals.css). */
export function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

/** Source used by the pre-hydration inline script in layout.tsx — kept as a
 * plain string (not imported) since that script runs before any bundle
 * loads. Must be kept in sync with the logic above by hand. */
export const THEME_INIT_SCRIPT = `
(function () {
  try {
    var stored = localStorage.getItem("${THEME_STORAGE_KEY}");
    var theme = stored === "light" || stored === "sepia" || stored === "dark"
      ? stored
      : (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    document.documentElement.dataset.theme = theme;
    if (theme === "dark") document.documentElement.classList.add("dark");
  } catch (e) {}
})();
`;
