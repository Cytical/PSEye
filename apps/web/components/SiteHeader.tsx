"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { NavLinks } from "./NavLinks";
import { TickerSearch } from "./TickerSearch";
import { ThemeToggle } from "./ThemeToggle";
import { Logo } from "./Logo";

/**
 * Eight nav triggers plus a search box collapse behind a hamburger toggle
 * below `lg`, with the same content shown inline above it.
 *
 * The cutoff was `sm` (640px), which was far too optimistic once the nav grew
 * to four primary links plus four dropdowns: measured on the live homepage, the
 * inline row wrapped to two lines at 1024px and 900px and to three at 768px,
 * inside a header pinned to a fixed 64px. Every visitor on a small laptop or a
 * landscape tablet got a nav spilling out of its own bar. The row is explicitly
 * `flex-nowrap` now so that failure mode can't come back the next time a link
 * is added: it will overflow visibly rather than silently restack.
 */
export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  // The header is sticky over a page that scrolls under it, but at the top of
  // the page it is sitting on its own background with a hairline border, which
  // is the same thing as not being sticky at all. Once anything has scrolled
  // beneath it, it takes on a shadow and a more opaque backdrop so it reads as
  // a layer above the page rather than part of it.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 4);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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
      className={`sticky top-0 z-30 border-b bg-background/90 backdrop-blur-md transition-shadow duration-200 supports-[backdrop-filter]:bg-background/75 ${
        scrolled
          ? "border-foreground/15 shadow-lg shadow-black/5 supports-[backdrop-filter]:bg-background/90"
          : "border-foreground/10"
      }`}
    >
      {/* max-w matches page.tsx's widest content container (the market map) so the
          header never reads as narrower than the page below it. Fixed h-16 (rather
          than py-N) so other pages can reliably offset sticky elements below the
          header's total height (64px, uniform across breakpoints now that the
          masthead strip is gone) — see MarketMap.tsx's filter sidebar `sm:top-16`. */}
      <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-x-4 px-4 text-sm">
        <Link href="/" className="mr-1 shrink-0">
          <Logo />
        </Link>

        <nav className="hidden flex-1 flex-nowrap items-center gap-x-4 lg:flex xl:gap-x-6" aria-label="Main">
          <NavLinks />
        </nav>

        <div className="ml-auto hidden items-center gap-3 lg:flex">
          {/* Hairline between the nav and the utility cluster, so the search
              box and theme toggle read as header chrome rather than as two
              more nav items. xl and up only: between lg and xl the row has no
              spare pixels (see the wrap note above) and this would spend 13 of
              them on decoration. */}
          <span aria-hidden className="hidden h-5 w-px bg-foreground/12 xl:block" />
          <TickerSearch />
          <ThemeToggle />
        </div>

        <div className="ml-auto flex items-center gap-3 lg:hidden">
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
          {/* Same reasoning, same pattern (2026-08-08): Portfolio is now the
              site's other high-retention page (see NavLinks' DROPDOWNS
              comment), but it's the first item inside the "Tools" dropdown
              rather than an inline PRIMARY link, which on mobile means one
              extra tap through the hamburger. This puts it back to one tap. */}
          <Link
            href="/portfolio"
            aria-label="Your portfolio"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-foreground/15 transition-colors hover:bg-panel-raised"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
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
        <div
          id="mobile-nav-panel"
          className="animate-overlay-panel max-h-[calc(100vh-4rem)] origin-top overflow-y-auto border-t border-foreground/10 bg-background px-4 py-3 shadow-xl shadow-black/20 lg:hidden"
        >
          <div className="mb-3">
            <TickerSearch />
          </div>
          {/* Distinct label from the desktop nav above: that one stays in the DOM
              (hidden sm:flex), so while this panel is open a screen reader would
              otherwise list two identically-named "Main" landmarks. */}
          <nav className="flex flex-col gap-2.5 pb-2 text-sm" aria-label="Mobile" onClick={() => setOpen(false)}>
            <NavLinks variant="stacked" />
          </nav>
        </div>
      )}
    </header>
  );
}
