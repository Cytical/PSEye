"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { ScreenerRow } from "@/lib/screener";
import { useWatchlist } from "@/lib/watchlist";
import { VISIBLE_SECTORS } from "@/lib/sectorSlug";
import { WatchlistStarButton } from "./WatchlistStarButton";

type SortKey =
  | "ticker"
  | "sector"
  | "price"
  | "pctChange"
  | "marketCap"
  | "investableMarketCap"
  | "yieldPct";

interface SortState {
  key: SortKey;
  dir: "asc" | "desc";
}

/** Numeric columns default to descending on first click (biggest first is what a screener is for); text to ascending. */
const DEFAULT_DIR: Record<SortKey, "asc" | "desc"> = {
  ticker: "asc",
  sector: "asc",
  price: "desc",
  pctChange: "desc",
  marketCap: "desc",
  investableMarketCap: "desc",
  yieldPct: "desc",
};

const COLUMNS: { key: SortKey; label: string; numeric: boolean; hideOnMobile?: boolean }[] = [
  { key: "ticker", label: "Company", numeric: false },
  { key: "sector", label: "Sector", numeric: false, hideOnMobile: true },
  { key: "price", label: "Price", numeric: true },
  { key: "pctChange", label: "Change", numeric: true },
  // Hidden below sm: with Float-adj. already visible (and sortable) there's no
  // room to also show raw market cap on a phone without forcing horizontal
  // scroll just to reach it — still there, and still sortable via this same
  // header, once the viewport is wide enough to show the column.
  { key: "marketCap", label: "Market cap", numeric: true, hideOnMobile: true },
  // Kept alongside raw market cap rather than replacing it: this is a data
  // table, so both are legitimately sortable — but the float-adjusted figure is
  // the default (see the initial `sort` state), matching /rankings and the
  // market map. See lib/floatAdjustedCap.ts.
  { key: "investableMarketCap", label: "Float-adj.", numeric: true },
  { key: "yieldPct", label: "Div yield", numeric: true, hideOnMobile: true },
];

/** Peso market cap, abbreviated — PSE caps run to the trillions, so a raw number is unreadable. */
function formatMarketCap(value: number): string {
  if (value <= 0) return "N/A";
  if (value >= 1e12) return `₱${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `₱${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `₱${(value / 1e6).toFixed(1)}M`;
  return `₱${value.toLocaleString("en-PH")}`;
}

/** Matches RankingsTable: sub-10% floats keep a decimal so 0.20% doesn't render as a flat "0%". */
function formatFreeFloat(pct: number): string {
  return `${pct < 10 ? pct.toFixed(1) : pct.toFixed(0)}%`;
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

export function ScreenerTable({ rows }: { rows: ScreenerRow[] }) {
  const [sort, setSort] = useState<SortState>({ key: "investableMarketCap", dir: "desc" });
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState<string>("all");
  const [watchedOnly, setWatchedOnly] = useState(false);
  const { tickers: watched } = useWatchlist();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (sector !== "all" && row.sector !== sector) return false;
      if (watchedOnly && !watched.includes(row.ticker)) return false;
      if (q && !row.ticker.toLowerCase().includes(q) && !row.companyName.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, query, sector, watchedOnly, watched]);

  const sorted = useMemo(() => [...filtered].sort((a, b) => compare(a, b, sort)), [filtered, sort]);

  function toggleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: DEFAULT_DIR[key] }
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search ticker or company…"
          aria-label="Search by ticker or company name"
          className="min-w-[200px] flex-1 rounded-lg bg-panel px-3 py-2 text-sm text-panel-fg shadow-sm shadow-black/5 ring-1 ring-panel-border placeholder:text-panel-fg/65 focus:outline-none focus:ring-2 focus:ring-panel-fg/30"
        />
        <select
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          aria-label="Filter by sector"
          className="rounded-lg bg-panel px-3 py-2 text-sm text-panel-fg shadow-sm shadow-black/5 ring-1 ring-panel-border focus:outline-none focus:ring-2 focus:ring-panel-fg/30"
        >
          <option value="all">All sectors</option>
          {VISIBLE_SECTORS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setWatchedOnly((v) => !v)}
          aria-pressed={watchedOnly}
          className={`rounded-lg px-3 py-2 text-sm ring-1 transition-colors ${
            watchedOnly
              ? "bg-panel-raised text-panel-fg ring-panel-fg/30"
              : "bg-panel text-panel-fg/70 ring-panel-border hover:text-panel-fg"
          }`}
        >
          ★ Watchlist{watched.length > 0 ? ` (${watched.length})` : ""}
        </button>
      </div>

      <p className="mt-3 text-xs text-panel-fg/68">
        {sorted.length} {sorted.length === 1 ? "stock" : "stocks"}
        {sorted.length !== rows.length ? ` of ${rows.length}` : ""}
      </p>

      <div className="mt-2 overflow-hidden rounded-xl bg-panel shadow-sm shadow-black/5 ring-1 ring-panel-border">
        <div className="overflow-x-auto">
          <table className="w-full text-xs sm:min-w-[840px] sm:text-sm">
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
              {sorted.map((row) => (
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
                    </Link>
                  </td>
                  <td className="hidden whitespace-nowrap py-2.5 pr-4 text-panel-fg/70 sm:table-cell">
                    {row.sector}
                  </td>
                  <td className="py-2 pr-2 text-right tabular-nums text-panel-fg sm:py-2.5 sm:pr-4">
                    {row.price == null ? <span className="text-panel-fg/65">N/A</span> : `₱${row.price.toFixed(2)}`}
                  </td>
                  <td className="py-2 pr-2 text-right font-medium tabular-nums sm:py-2.5 sm:pr-4">
                    <span className={changeColor(row.pctChange ?? 0)}>
                      {(row.pctChange ?? 0) >= 0 ? "+" : ""}
                      {(row.pctChange ?? 0).toFixed(2)}%
                    </span>
                  </td>
                  {/* Both cap columns keep full-strength ink here, unlike
                      RankingsTable where the raw one is muted: there the order
                      is fixed, but here either column can be the active sort,
                      and muting one meant sorting by Market cap greyed out the
                      very column being sorted. The header arrow marks the
                      active one. */}
                  <td className="hidden py-2.5 pr-4 text-right tabular-nums text-panel-fg sm:table-cell">
                    {formatMarketCap(row.marketCap)}
                  </td>
                  <td className="py-2 pr-2 text-right tabular-nums text-panel-fg sm:py-2.5 sm:pr-4">
                    {formatMarketCap(row.investableMarketCap)}
                    {row.freeFloatPct != null && (
                      <span className="ml-1.5 hidden text-[11px] text-panel-fg/60 sm:inline">
                        {formatFreeFloat(row.freeFloatPct)}
                      </span>
                    )}
                  </td>
                  <td className="hidden py-2.5 pr-4 text-right tabular-nums sm:table-cell">
                    {row.yieldPct == null ? (
                      <span className="text-panel-fg/65">N/A</span>
                    ) : (
                      <span className={row.yieldPct >= 4 ? "text-up" : "text-panel-fg"}>
                        {row.yieldPct.toFixed(2)}%
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {sorted.length === 0 && (
        <p className="mt-6 rounded-lg bg-panel p-6 text-center text-sm text-panel-fg/68 ring-1 ring-panel-border">
          {watchedOnly && watched.length === 0
            ? "Your watchlist is empty. Tap a ★ to add stocks."
            : "No stocks match your filters."}
        </p>
      )}
    </div>
  );
}
