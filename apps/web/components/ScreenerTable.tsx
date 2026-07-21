"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { PSE_SECTORS } from "@pseye/source-quotes";
import type { ScreenerRow } from "@/lib/screener";
import { useWatchlist } from "@/lib/watchlist";
import { WatchlistStarButton } from "./WatchlistStarButton";

type SortKey = "ticker" | "sector" | "price" | "pctChange" | "marketCap" | "yieldPct";

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
  yieldPct: "desc",
};

const COLUMNS: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: "ticker", label: "Company", numeric: false },
  { key: "sector", label: "Sector", numeric: false },
  { key: "price", label: "Price", numeric: true },
  { key: "pctChange", label: "Change", numeric: true },
  { key: "marketCap", label: "Market cap", numeric: true },
  { key: "yieldPct", label: "Div yield", numeric: true },
];

/** Peso market cap, abbreviated — PSE caps run to the trillions, so a raw number is unreadable. */
function formatMarketCap(value: number): string {
  if (value <= 0) return "—";
  if (value >= 1e12) return `₱${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `₱${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `₱${(value / 1e6).toFixed(1)}M`;
  return `₱${value.toLocaleString("en-PH")}`;
}

function changeColor(pctChange: number): string {
  return pctChange >= 0 ? "text-[#30cc5a]" : "text-[#f6362f]";
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
  const [sort, setSort] = useState<SortState>({ key: "marketCap", dir: "desc" });
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
          className="min-w-[200px] flex-1 rounded-lg bg-panel px-3 py-2 text-sm text-panel-fg ring-1 ring-panel-border placeholder:text-panel-fg/40 focus:outline-none focus:ring-2 focus:ring-panel-fg/30"
        />
        <select
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          aria-label="Filter by sector"
          className="rounded-lg bg-panel px-3 py-2 text-sm text-panel-fg ring-1 ring-panel-border focus:outline-none focus:ring-2 focus:ring-panel-fg/30"
        >
          <option value="all">All sectors</option>
          {PSE_SECTORS.map((s) => (
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

      <p className="mt-3 text-xs text-panel-fg/50">
        {sorted.length} {sorted.length === 1 ? "stock" : "stocks"}
        {sorted.length !== rows.length ? ` of ${rows.length}` : ""}
      </p>

      <div className="mt-2 overflow-hidden rounded-lg bg-panel ring-1 ring-panel-border">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-panel-border text-left text-[10px] uppercase tracking-wide text-panel-fg/50">
                <th className="w-9 py-1.5 pl-3" aria-label="Watchlist" />
                {COLUMNS.map((col) => {
                  const isActive = sort.key === col.key;
                  return (
                    <th
                      key={col.key}
                      aria-sort={isActive ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
                      className={`py-1.5 pr-4 font-medium ${col.numeric ? "text-right" : ""}`}
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
                  <td className="py-2 pl-2">
                    <WatchlistStarButton ticker={row.ticker} size={16} />
                  </td>
                  <td className="py-2.5 pr-4">
                    <Link href={`/stocks/${row.ticker}`} className="text-panel-fg hover:underline">
                      <span className="font-mono text-xs font-semibold">{row.ticker}</span>
                      <span className="ml-2 text-panel-fg/70">{row.companyName}</span>
                    </Link>
                  </td>
                  <td className="py-2.5 pr-4 whitespace-nowrap text-panel-fg/70">{row.sector}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-panel-fg">
                    {row.price == null ? <span className="text-panel-fg/40">N/A</span> : `₱${row.price.toFixed(2)}`}
                  </td>
                  <td className="py-2.5 pr-4 text-right font-medium tabular-nums">
                    {row.pctChange == null ? (
                      <span className="text-panel-fg/40">—</span>
                    ) : (
                      <span className={changeColor(row.pctChange)}>
                        {row.pctChange >= 0 ? "+" : ""}
                        {row.pctChange.toFixed(2)}%
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-panel-fg">{formatMarketCap(row.marketCap)}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums">
                    {row.yieldPct == null ? (
                      <span className="text-panel-fg/40">—</span>
                    ) : (
                      <span className={row.yieldPct >= 4 ? "text-[#30cc5a]" : "text-panel-fg"}>
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
        <p className="mt-6 rounded-lg bg-panel p-6 text-center text-sm text-panel-fg/50 ring-1 ring-panel-border">
          {watchedOnly && watched.length === 0
            ? "Your watchlist is empty — tap a ★ to add stocks."
            : "No stocks match your filters."}
        </p>
      )}
    </div>
  );
}
