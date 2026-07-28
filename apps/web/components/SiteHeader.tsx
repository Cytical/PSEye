"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { NavLinks } from "./NavLinks";
import { TickerSearch } from "./TickerSearch";
import { ThemeToggle } from "./ThemeToggle";
import { Logo } from "./Logo";

/**
 * Nine nav links plus a search box no longer fit comfortably on a phone
 * screen without wrapping into a multi-row mess — collapses NavLinks +
 * TickerSearch behind a hamburger toggle below `sm`, same content shown
 * inline above it (matches the earlier project decision that wrapping was
 * fine when it was just nav links; adding search tipped the balance).
 */
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  // Same close-on-outside-click/Escape contract as NavLinks' NavDropdown and
  // CalendarDatePicker — without it, this was the one disclosure on the site
  // that only closed by tapping a link inside it or the toggle button again.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-30 border-b border-foreground/10 bg-background/90 backdrop-blur-md supports-[backdrop-filter]:bg-background/75"
    >
      {/* max-w matches page.tsx's widest content container (the market map) so the
          header never reads as narrower than the page below it. Fixed h-16 (rather
          than py-N) so other pages can reliably offset sticky elements below the
          header's total height (64px, uniform across breakpoints now that the
          masthead strip is gone) — see MarketMap.tsx's filter sidebar `sm:top-16`. */}
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-x-5 gap-y-1.5 px-4 text-sm">
        <Link href="/" className="mr-1 shrink-0">
          <Logo />
        </Link>

        <nav className="hidden flex-1 flex-wrap items-center gap-x-6 gap-y-1.5 sm:flex" aria-label="Main">
          <NavLinks />
        </nav>

        <div className="ml-auto hidden items-center gap-3 sm:flex">
          <TickerSearch />
          <ThemeToggle />
        </div>

        <div className="ml-auto flex items-center gap-3 sm:hidden">
          {/* Quick link to Daily Recap, mobile only — on desktop it's already
              an inline nav link (see NavLinks' PRIMARY), but the mobile nav
              collapses everything behind the hamburger, which buried the
              site's second-highest-traffic page behind a tap. This puts it
              back one tap away without touching the "/" homepage's SEO
              standing (no redirect, no route change). */}
          <Link
            href="/daily"
            aria-label="Today's daily recap"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-foreground/15 transition-colors hover:bg-panel-raised"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="3" y1="10" x2="21" y2="10" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="16" y1="2" x2="16" y2="6" />
            </svg>
          </Link>
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            // The panel is conditionally rendered, so referencing its id while
            // closed points at nothing — invalid ARIA.
            aria-controls={open ? "mobile-nav-panel" : undefined}
            aria-label={open ? "Close menu" : "Open menu"}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-foreground/15 transition-colors hover:bg-panel-raised"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              {open ? (
                <>
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </>
              ) : (
                <>
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </>
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-nav-panel" className="border-t border-foreground/10 px-4 py-3 sm:hidden">
          <div className="mb-3">
            <TickerSearch />
          </div>
          {/* Distinct label from the desktop nav above: that one stays in the DOM
              (hidden sm:flex), so while this panel is open a screen reader would
              otherwise list two identically-named "Main" landmarks. */}
          <nav className="flex flex-col gap-2.5 text-sm" aria-label="Mobile" onClick={() => setOpen(false)}>
            <NavLinks variant="stacked" />
          </nav>
        </div>
      )}
    </header>
  );
}
