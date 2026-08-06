"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PSE_EDGE_COMPANIES } from "@pseye/source-quotes";

const MAX_RESULTS = 8;

/**
 * Shown the moment the box is focused, before anything is typed. An empty
 * search box is a dead end that asks the visitor to already know a ticker;
 * these are the index's most recognisable names, so there is always something
 * to click. Curated by hand (the roster carries no popularity signal) and
 * resolved against it, so a ticker that ever leaves the roster drops out of
 * the list rather than 404ing.
 */
const QUICK_PICK_TICKERS = ["SM", "BDO", "ALI", "BPI", "ICT", "TEL"];

const QUICK_PICKS = QUICK_PICK_TICKERS.map((t) => PSE_EDGE_COMPANIES.find((c) => c.ticker === t)).filter(
  (c): c is (typeof PSE_EDGE_COMPANIES)[number] => c != null,
);

/**
 * Client-side typeahead over the bundled company roster (no network request
 * per keystroke — ~97 companies is small enough to filter in memory) that
 * navigates to /stocks/[ticker] on selection. Zero search UI existed
 * anywhere in the app before this; pairs directly with the stock pages this
 * links to.
 */
export function TickerSearch() {
  const router = useRouter();
  const listboxId = useId();
  const baseOptionId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const activeOptionId = (i: number) => `${baseOptionId}-${i}`;

  const trimmed = query.trim();
  const showingQuickPicks = trimmed.length === 0;

  const results = useMemo(() => {
    const q = trimmed.toLowerCase();
    if (q.length === 0) return QUICK_PICKS;
    return PSE_EDGE_COMPANIES.filter(
      (c) => c.ticker.toLowerCase().includes(q) || c.companyName.toLowerCase().includes(q)
    ).slice(0, MAX_RESULTS);
  }, [trimmed]);

  /**
   * "/" jumps to the search box from anywhere on the page, the convention on
   * every site that has a search box worth using.
   *
   * Both header instances (inline nav, mobile panel) mount this, but exactly
   * one of them is ever visible: the inline nav is `hidden lg:flex` and the
   * mobile panel is `lg:hidden`, so the `offsetParent` check leaves precisely
   * one listener willing to act on the key.
   */
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
      const input = inputRef.current;
      if (!input || input.offsetParent === null) return;
      e.preventDefault();
      input.focus();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  function go(ticker: string) {
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
    router.push(`/stocks/${ticker}`);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      go(results[activeIndex].ticker);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    // Narrower between lg and xl, where the inline nav row and the search box
    // are competing for the same header width (see SiteHeader) — the input is
    // still wide enough to read a ticker and a partial company name in.
    <div className="relative w-full max-w-[220px] lg:max-w-[150px] xl:max-w-[220px]">
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-foreground/45"
      >
        <circle cx="11" cy="11" r="7" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open && results.length > 0}
        // Only while the listbox is actually in the DOM: aria-controls pointing
        // at an id that doesn't exist is invalid ARIA, and the listbox below is
        // conditionally rendered rather than hidden.
        aria-controls={open && results.length > 0 ? listboxId : undefined}
        aria-autocomplete="list"
        aria-activedescendant={open && results.length > 0 ? activeOptionId(activeIndex) : undefined}
        aria-label="Search PSE stocks by ticker or company name"
        // Shorter than the aria-label on purpose: the box loses 28px to the
        // icon and the shortcut hint, and at its 150px lg width the longer
        // "Search ticker or company…" was truncating mid-word.
        placeholder="Search stocks…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActiveIndex(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={handleKeyDown}
        className="w-full rounded-md border border-foreground/15 bg-transparent py-1 pl-7 pr-7 text-xs transition-colors placeholder:text-foreground/45 focus:border-accent/55 focus:outline-none focus:ring-1 focus:ring-accent/25"
      />
      {/* The shortcut hint doubles as the "this is a search box" cue once the
          placeholder is truncated. Hidden while typing (it would sit under the
          text) and below xl, where the box narrows to 150px and this is the
          first thing that should give up its space. */}
      {query.length === 0 && (
        <kbd className="pointer-events-none absolute right-1.5 top-1/2 hidden -translate-y-1/2 rounded border border-foreground/15 px-1 font-mono text-[10px] leading-4 text-foreground/45 xl:block">
          /
        </kbd>
      )}
      {open && results.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="animate-overlay-panel absolute left-0 right-0 top-full z-20 mt-1 max-h-72 origin-top overflow-y-auto rounded-md bg-panel py-1 shadow-xl shadow-black/20 ring-1 ring-panel-border"
        >
          {showingQuickPicks && (
            <li role="presentation" className="kicker px-2.5 pb-1 pt-1 text-panel-fg/60">
              Popular
            </li>
          )}
          {results.map((c, i) => (
            <li
              key={c.ticker}
              id={activeOptionId(i)}
              role="option"
              aria-selected={i === activeIndex}
              onMouseDown={(e) => {
                e.preventDefault();
                go(c.ticker);
              }}
              onMouseEnter={() => setActiveIndex(i)}
              className={`flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-xs text-panel-fg ${
                i === activeIndex ? "bg-panel-active" : ""
              }`}
            >
              <span className="rounded bg-panel-raised px-1 py-0.5 font-mono text-[10px]">{c.ticker}</span>
              <span className="truncate">{c.companyName}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
