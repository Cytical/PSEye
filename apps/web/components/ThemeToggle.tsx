"use client";

import { useState } from "react";
import { applyTheme, THEME_STORAGE_KEY, THEMES, type Theme } from "@/lib/theme";

export function ThemeToggle() {
  // Lazy initializer reads the same DOM attribute the pre-hydration script
  // in layout.tsx sets, so the client render always agrees with the server's
  // default ("light") plus whatever the script already applied by the time
  // this component mounts.
  const [active, setActive] = useState<Theme>(() => {
    if (typeof document === "undefined") return "light";
    return (document.documentElement.dataset.theme as Theme | undefined) ?? "light";
  });

  function select(theme: Theme) {
    applyTheme(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    setActive(theme);
  }

  return (
    <div className="flex shrink-0 items-center gap-1.5" role="group" aria-label="Theme">
      {THEMES.map(({ value, label, swatch }) => (
        <button
          key={value}
          type="button"
          onClick={() => select(value)}
          aria-label={`${label} theme`}
          aria-pressed={active === value}
          title={label}
          className={`h-5 w-5 shrink-0 rounded-full border transition ${
            active === value
              ? "border-black/60 ring-2 ring-offset-2 ring-offset-background ring-black/50 dark:border-white/70 dark:ring-white/50"
              : "border-black/20 hover:scale-110 dark:border-white/25"
          }`}
          style={{ backgroundColor: swatch }}
        />
      ))}
    </div>
  );
}
