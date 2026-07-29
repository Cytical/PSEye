"use client";

import { useState } from "react";
import { applyTheme, THEME_STORAGE_KEY, type Theme } from "@/lib/theme";

/**
 * One button that flips between the two themes, rather than the pair of
 * swatch dots this used to be: with only two themes, a radio-style pair made
 * the visitor read two controls to work out which one was already active.
 * Styled as the same 32px bordered icon button as the header's other icon
 * controls (mobile daily-recap link, hamburger) and sharing the ticker
 * search input's border/radius, so it reads as part of the header rather
 * than a separate widget.
 *
 * Which icon shows is decided in CSS (`dark:` keys off the same <html> class
 * the pre-hydration script sets — see the @custom-variant in globals.css),
 * not from React state. Both icons are always rendered and crossfaded, so
 * the button's size never depends on which one is showing, the className is
 * identical on server and client (no hydration mismatch to suppress on
 * either <svg>), and a stored light preference shows the moon in the very
 * first paint instead of flashing the server default's sun until hydration.
 */
export function ThemeToggle() {
  // Only the label needs the live value. The lazy initializer reads the same
  // DOM attribute the pre-hydration script in layout.tsx sets, so the client
  // render agrees with the server's "dark" default plus whatever that script
  // already applied by the time this component mounts.
  const [active, setActive] = useState<Theme>(() => {
    if (typeof document === "undefined") return "dark";
    return (document.documentElement.dataset.theme as Theme | undefined) ?? "dark";
  });

  const next: Theme = active === "dark" ? "light" : "dark";
  const label = `Switch to ${next} theme`;

  function toggle() {
    applyTheme(next);
    localStorage.setItem(THEME_STORAGE_KEY, next);
    setActive(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      // aria-label/title depend on `active`, which can legitimately differ
      // from the server's "dark" default once the pre-hydration script has
      // applied a stored light preference — expected per Next's inline-script
      // theming pattern, not a real mismatch.
      suppressHydrationWarning
      aria-label={label}
      title={label}
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-foreground/15 text-foreground/70 transition-colors hover:bg-panel-raised hover:text-foreground"
    >
      <span className="relative block h-4 w-4">
        {/* Sun — shown in dark mode, i.e. the theme a click would take you to. */}
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="absolute inset-0 h-4 w-4 -rotate-90 scale-50 opacity-0 transition-all duration-200 dark:rotate-0 dark:scale-100 dark:opacity-100"
        >
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
        </svg>
        {/* Moon — shown in light mode. */}
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="absolute inset-0 h-4 w-4 rotate-0 scale-100 opacity-100 transition-all duration-200 dark:rotate-90 dark:scale-50 dark:opacity-0"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 0 0 9.79 9.79Z" />
        </svg>
      </span>
    </button>
  );
}
