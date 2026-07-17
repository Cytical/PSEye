"use client";

import { useId, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PSE_EDGE_COMPANIES } from "@pseye/source-quotes";

const MAX_RESULTS = 8;

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

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return [];
    return PSE_EDGE_COMPANIES.filter(
      (c) => c.ticker.toLowerCase().includes(q) || c.companyName.toLowerCase().includes(q)
    ).slice(0, MAX_RESULTS);
  }, [query]);

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
    <div className="relative w-full max-w-[220px]">
      <input
        ref={inputRef}
        type="text"
        role="combobox"
        aria-expanded={open && results.length > 0}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={open && results.length > 0 ? activeOptionId(activeIndex) : undefined}
        aria-label="Search PSE stocks by ticker or company name"
        placeholder="Search ticker or company…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setActiveIndex(0);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 120)}
        onKeyDown={handleKeyDown}
        className="w-full rounded-md border border-black/15 bg-transparent px-2.5 py-1 text-xs dark:border-white/15"
      />
      {open && results.length > 0 && (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-md bg-panel py-1 shadow-lg ring-1 ring-panel-border"
        >
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
