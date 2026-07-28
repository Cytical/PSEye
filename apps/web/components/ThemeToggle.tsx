"use client";

import { useState } from "react";
import { applyTheme, THEME_STORAGE_KEY, THEMES, type Theme } from "@/lib/theme";

export function ThemeToggle() {
  // Lazy initializer reads the same DOM attribute the pre-hydration script
  // in layout.tsx sets, so the client render always agrees with the server's
  // default ("dark") plus whatever the script already applied by the time
  // this component mounts.
  const [active, setActive] = useState<Theme>(() => {
    if (typeof document === "undefined") return "dark";
    return (document.documentElement.dataset.theme as Theme | undefined) ?? "dark";
  });

  function select(theme: Theme) {
    applyTheme(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    setActive(theme);
  }

  return (
    <div className="flex shrink-0 items-center gap-1" role="group" aria-label="Theme">
      {THEMES.map(({ value, label, swatch }) => (
        <button
          key={value}
          type="button"
          onClick={() => select(value)}
          aria-label={`${label} theme`}
          aria-pressed={active === value}
          title={label}
          // The active swatch depends on the client's real theme, which the
          // pre-hydration script may already have changed away from the
          // server's "light" default (e.g. system dark mode) — expected
          // per Next's inline-script theming pattern, not a real mismatch.
          suppressHydrationWarning
          // The button is 24px (meets the 24x24 minimum touch-target size)
          // even though the visible swatch inside stays a small 16px dot —
          // padding grows the hit area without the toggle reading as a
          // suddenly-bigger circle.
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition hover:scale-110"
        >
          <span
            className={`h-4 w-4 rounded-full border transition ${
              active === value
                ? "border-foreground/60 ring-2 ring-offset-2 ring-offset-background ring-foreground/50"
                : "border-foreground/20"
            }`}
            style={{ backgroundColor: swatch }}
          />
        </button>
      ))}
    </div>
  );
}
