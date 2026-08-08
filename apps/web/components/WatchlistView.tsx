"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ScreenerRow } from "@/lib/screener";
import { useIsHydrated, useWatchlist } from "@/lib/watchlist";
import { usePortfolioHoldings } from "@/lib/usePortfolioHoldings";
import { WatchlistStarButton } from "./WatchlistStarButton";

type SortKey = "companyName" | "price" | "pctChange" | "marketCap" | "yieldPct" | "peRatio";

interface SortState {
  key: SortKey;
  dir: "asc" | "desc";
}

/** Numeric columns default to descending on first click (biggest first); Company to ascending. */
const DEFAULT_DIR: Record<SortKey, "asc" | "desc"> = {
  companyName: "asc",
  price: "desc",
  pctChange: "desc",
  marketCap: "desc",
  yieldPct: "desc",
  peRatio: "desc",
};

const COLUMNS: { key: SortKey; label: string; numeric: boolean; hideOnMobile?: boolean }[] = [
  { key: "companyName", label: "Company", numeric: false },
  { key: "price", label: "Price", numeric: true },
  { key: "pctChange", label: "Change", numeric: true },
  { key: "marketCap", label: "Market cap", numeric: true, hideOnMobile: true },
  { key: "yieldPct", label: "Div yield", numeric: true, hideOnMobile: true },
  { key: "peRatio", label: "P/E", numeric: true, hideOnMobile: true },
];

/** Peso market cap, abbreviated — matches ScreenerTable/RankingsTable. */
function formatMarketCap(value: number): string {
  if (value <= 0) return "N/A";
  if (value >= 1e12) return `₱${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `₱${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `₱${(value / 1e6).toFixed(1)}M`;
  return `₱${value.toLocaleString("en-PH")}`;
}

function changeColor(pctChange: number): string {
  return pctChange >= 0 ? "text-up" : "text-down";
}

/** Nulls always sort last regardless of direction — a missing value is never "the biggest". */
function compare(a: ScreenerRow, b: ScreenerRow, { key, dir }: SortState): number {
  const av = a[key];
  const bv = b[key];
  if (av === null && bv === null) return a.ticker.localeCompare(b.ticker);
  if (av === null) return 1;
  if (bv === null) return -1;
  const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
  return dir === "asc" ? cmp : -cmp;
}

function SkeletonRows() {
  return (
    <div className="animate-pulse divide-y divide-panel-border" aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-3 py-3">
          <div className="h-4 w-4 rounded bg-panel-raised" />
          <div className="h-3 w-32 rounded bg-panel-raised" />
          <div className="ml-auto h-3 w-16 rounded bg-panel-raised" />
        </div>
      ))}
    </div>
  );
}

export function WatchlistView({ rows }: { rows: ScreenerRow[] }) {
  const hydrated = useIsHydrated();
  const { tickers } = useWatchlist();
  const { holdings } = usePortfolioHoldings();
  const heldTickers = useMemo(() => new Set(holdings.map((h) => h.ticker)), [holdings]);
  // Defaults to today's move rather than by size: on a page you open to check
  // in on a handful of names, the useful ordering is "what happened", not
  // "which is biggest". Stocks that did not trade sink to the bottom instead
  // of being treated as flat (nulls-last, handled by compare()).
  const [sort, setSort] = useState<SortState>({ key: "pctChange", dir: "desc" });

  const { watched, missing } = useMemo(() => {
    const wanted = new Set(tickers);
    const watched = rows.filter((r) => wanted.has(r.ticker)).sort((a, b) => compare(a, b, sort));
    const found = new Set(watched.map((r) => r.ticker));
    return { watched, missing: tickers.filter((t) => !found.has(t)) };
  }, [rows, tickers, sort]);

  function toggleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: DEFAULT_DIR[key] }
    );
  }

  const traded = watched.filter((r) => r.pctChange != null);
  const up = traded.filter((r) => r.pctChange! > 0).length;
  const down = traded.filter((r) => r.pctChange! < 0).length;
  const flat = traded.length - up - down;

  if (!hydrated) {
    return (
      <div className="overflow-hidden rounded-xl bg-panel shadow-sm shadow-black/5 ring-1 ring-panel-border">
        <SkeletonRows />
      </div>
    );
  }

  if (watched.length === 0) {
    return (
      <div className="rounded-xl bg-panel p-8 text-center shadow-sm shadow-black/5 ring-1 ring-panel-border">
        <p className="font-serif text-lg font-semibold text-panel-fg">Your watchlist is empty</p>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-panel-fg/68">
          Tap the star next to any stock, on the market map, a company page, or any table on the
          site, and it will show up here with today&apos;s price. Nothing is sent anywhere: the list
          is kept in this browser only, with no account needed.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link
            href="/screener"
            className="rounded-md bg-panel-raised px-3.5 py-2 text-sm font-medium text-panel-fg ring-1 ring-panel-border transition-colors hover:bg-panel-active"
          >
            Browse every stock
          </Link>
          <Link
            href="/rankings"
            className="rounded-md bg-panel-raised px-3.5 py-2 text-sm font-medium text-panel-fg ring-1 ring-panel-border transition-colors hover:bg-panel-active"
          >
            Biggest companies
          </Link>
          <Link
            href="/"
            className="rounded-md bg-panel-raised px-3.5 py-2 text-sm font-medium text-panel-fg ring-1 ring-panel-border transition-colors hover:bg-panel-active"
          >
            Market map
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-panel-fg/68">
        {watched.length} {watched.length === 1 ? "stock" : "stocks"}
        {traded.length > 0 && (
          <>
            {" · "}
            <span className="text-up">{up} up</span>
            {" · "}
            <span className="text-down">{down} down</span>
            {flat > 0 && ` · ${flat} unchanged`}
          </>
        )}
        {traded.length < watched.length && ` · ${watched.length - traded.length} did not trade`}
      </p>

      <div className="overflow-hidden rounded-xl bg-panel shadow-sm shadow-black/5 ring-1 ring-panel-border">
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:min-w-[760px] sm:text-sm">
            <thead>
              <tr className="kicker border-b border-panel-border bg-panel-raised/50 text-left text-panel-fg/68">
                <th className="w-7 py-1.5 pl-2 sm:w-9 sm:pl-3" aria-label="Watchlist" />
                {COLUMNS.map((col) => {
                  const isActive = sort.key === col.key;
                  return (
                    <th
                      key={col.key}
                      aria-sort={isActive ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
                      className={`py-1.5 pr-2 font-medium sm:pr-4 ${col.numeric ? "text-right" : ""} ${
                        col.hideOnMobile ? "hidden sm:table-cell" : ""
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => toggleSort(col.key)}
                        className={`inline-flex items-center gap-1 py-1.5 uppercase tracking-wide transition-colors hover:text-panel-fg ${
                          isActive ? "text-panel-fg" : ""
                        }`}
                      >
                        {col.label}
                        <span aria-hidden="true" className={isActive ? "" : "invisible"}>
                          {isActive && sort.dir === "asc" ? "▲" : "▼"}
                        </span>
                      </button>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-panel-border">
              {watched.map((row) => (
                <tr key={row.ticker} className="transition-colors hover:bg-panel-raised">
                  <td className="py-2 pl-1.5 sm:pl-2">
                    <WatchlistStarButton ticker={row.ticker} size={16} />
                  </td>
                  <td className="max-w-[110px] py-2 pr-2 sm:max-w-none sm:py-2.5 sm:pr-4">
                    <Link
                      href={`/stocks/${row.ticker}`}
                      className="flex items-center gap-1.5 text-panel-fg hover:underline"
                    >
                      <span className="shrink-0 font-mono text-[10px] font-semibold sm:text-xs">{row.ticker}</span>
                      <span className="min-w-0 flex-1 truncate text-panel-fg/70">{row.companyName}</span>
                      {heldTickers.has(row.ticker) && (
                        <span
                          title="You hold this in your portfolio"
                          className="shrink-0 rounded bg-accent/15 px-1.5 py-0.5 text-[10px] font-medium text-accent"
                        >
                          Held
                        </span>
                      )}
                    </Link>
                  </td>
                  <td className="py-2 pr-2 text-right tabular-nums text-panel-fg sm:py-2.5 sm:pr-4">
                    {row.price == null ? <span className="text-panel-fg/65">N/A</span> : `₱${row.price.toFixed(2)}`}
                  </td>
                  <td className="py-2 pr-2 text-right font-medium tabular-nums sm:py-2.5 sm:pr-4">
                    {row.pctChange == null ? (
                      <span className="text-panel-fg/65">N/A</span>
                    ) : (
                      <span className={changeColor(row.pctChange)}>
                        {row.pctChange >= 0 ? "+" : ""}
                        {row.pctChange.toFixed(2)}%
                      </span>
                    )}
                  </td>
                  <td className="hidden py-2.5 pr-4 text-right tabular-nums text-panel-fg/70 sm:table-cell">
                    {formatMarketCap(row.marketCap)}
                  </td>
                  <td className="hidden py-2.5 pr-4 text-right tabular-nums sm:table-cell">
                    {row.yieldPct == null ? (
                      <span className="text-panel-fg/65">N/A</span>
                    ) : (
                      <span className="text-panel-fg">{row.yieldPct.toFixed(2)}%</span>
                    )}
                  </td>
                  <td className="hidden py-2.5 pr-4 text-right tabular-nums text-panel-fg sm:table-cell">
                    {row.peRatio == null ? <span className="text-panel-fg/65">N/A</span> : row.peRatio.toFixed(1)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {missing.length > 0 && (
        // Explicit {" "} after every expression: a plain newline between a JSX
        // expression and the text following it is stripped, which rendered
        // this as "DELISTEDXY ison your watchlist".
        <p className="text-xs text-panel-fg/68">
          {missing.join(", ")}{" "}
          {missing.length === 1 ? "is" : "are"}{" "}
          on your watchlist but not in the current session&apos;s data, so{" "}
          {missing.length === 1 ? "it is" : "they are"}{" "}
          not shown. This usually means the stock has been delisted or suspended.
        </p>
      )}
    </div>
  );
}
