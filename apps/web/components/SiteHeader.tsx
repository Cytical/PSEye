"use client";

import { useState } from "react";
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

  return (
    <header className="border-b border-black/10 dark:border-white/10">
      {/* max-w matches page.tsx's widest content container (the market map) so the
          header never reads as narrower than the page below it. */}
      <div className="mx-auto flex max-w-[1600px] items-center gap-x-5 gap-y-1.5 px-4 py-3 text-sm">
        <Link href="/" className="mr-1 shrink-0">
          <Logo />
        </Link>

        <nav className="hidden flex-1 flex-wrap items-center gap-x-5 gap-y-1.5 sm:flex" aria-label="Main">
          <NavLinks />
        </nav>

        <div className="ml-auto hidden items-center gap-3 sm:flex">
          <TickerSearch />
          <ThemeToggle />
        </div>

        <div className="ml-auto flex items-center gap-3 sm:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-nav-panel"
            aria-label={open ? "Close menu" : "Open menu"}
            className="flex h-8 w-8 items-center justify-center rounded-md border border-black/10 dark:border-white/15"
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
        <div id="mobile-nav-panel" className="border-t border-black/10 px-4 py-3 sm:hidden dark:border-white/10">
          <div className="mb-3">
            <TickerSearch />
          </div>
          <nav className="flex flex-col gap-2.5 text-sm" aria-label="Main" onClick={() => setOpen(false)}>
            <NavLinks />
          </nav>
        </div>
      )}
    </header>
  );
}
