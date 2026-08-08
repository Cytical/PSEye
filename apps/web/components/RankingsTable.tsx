"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { RankingRow } from "@/lib/rankings";
import { WatchlistStarButton } from "./WatchlistStarButton";

type SortKey = "rank" | "companyName" | "price" | "pctChange" | "marketCap" | "investableMarketCap";

interface SortState {
  key: SortKey;
  dir: "asc" | "desc";
}

/** Numeric columns default to descending on first click (biggest first); rank/text to ascending. */
const DEFAULT_DIR: Record<SortKey, "asc" | "desc"> = {
  rank: "asc",
  companyName: "asc",
  price: "desc",
  pctChange: "desc",
  marketCap: "desc",
  investableMarketCap: "desc",
};

const COLUMNS: { key: SortKey; label: string; numeric: boolean; hideOnMobile?: boolean }[] = [
  { key: "rank", label: "#", numeric: true },
  { key: "companyName", label: "Company", numeric: false },
  { key: "price", label: "Price", numeric: true },
  { key: "pctChange", label: "Change", numeric: true },
  // Raw market cap is hidden below sm — PSE cap (with its inline free-float %
  // on the two tickers where it actually differs from raw) is the column rows
  // default-sort by and stays visible, so a phone screen isn't forced to
  // scroll just to see the number that explains the ranking. Labeled "PSE
  // cap", not "Float-adj.": since only MFC/SLF are float-adjusted (see
  // lib/floatAdjustedCap.ts), that label would misdescribe every other row.
  { key: "marketCap", label: "Market cap", numeric: true, hideOnMobile: true },
  { key: "investableMarketCap", label: "PSE cap", numeric: true },
];

/** Peso market cap, abbreviated — matches ScreenerTable's formatMarketCap. */
function formatMarketCap(value: number): string {
  if (value >= 1e12) return `₱${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `₱${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `₱${(value / 1e6).toFixed(1)}M`;
  return `₱${value.toLocaleString("en-PH")}`;
}

/**
 * Free float as a percentage. Sub-10% floats keep a decimal: the two foreign
 * dual-listings sit at 0.20% and 0.62%, which `toFixed(0)` renders as a flat
 * "0%" — indistinguishable from no float at all, and the exact reason those
 * two rows are where they are.
 */
function formatFreeFloat(pct: number): string {
  return `${pct < 10 ? pct.toFixed(1) : pct.toFixed(0)}%`;
}

function changeColor(pctChange: number): string {
  return pctChange >= 0 ? "text-up" : "text-down";
}

/**
 * "rank" isn't a real RankingRow field — which of overallRank/sectorRank it
 * means depends on the rankKey prop — so it's resolved here rather than by
 * indexing the row directly.
 */
function getValue(row: RankingRow, key: SortKey, rankKey: "overallRank" | "sectorRank"): string | number | null {
  if (key === "rank") return row[rankKey];
  return row[key];
}

/** Nulls always sort last regardless of direction — a missing value is never "the biggest". */
function compare(a: RankingRow, b: RankingRow, { key, dir }: SortState, rankKey: "overallRank" | "sectorRank"): number {
  const av = getValue(a, key, rankKey);
  const bv = getValue(b, key, rankKey);
  if (av === null && bv === null) return a.ticker.localeCompare(b.ticker);
  if (av === null) return 1;
  if (bv === null) return -1;
  const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
  return dir === "asc" ? cmp : -cmp;
}

export function RankingsTable({ rows, rankKey = "overallRank" }: { rows: RankingRow[]; rankKey?: "overallRank" | "sectorRank" }) {
  // Rows arrive pre-sorted by investableMarketCap desc; matching that here
  // means the initial render is identical to the old static table.
  const [sort, setSort] = useState<SortState>({ key: "investableMarketCap", dir: "desc" });

  const sorted = useMemo(() => [...rows].sort((a, b) => compare(a, b, sort, rankKey)), [rows, sort, rankKey]);

  function toggleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: DEFAULT_DIR[key] }
    );
  }

  return (
    <div className="overflow-hidden rounded-xl bg-panel shadow-sm shadow-black/5 ring-1 ring-panel-border">
      <div className="overflow-x-auto">
        <table className="w-full text-xs sm:min-w-[760px] sm:text-sm">
          <thead>
            <tr className="kicker border-b border-panel-border bg-panel-raised/50 text-left text-panel-fg/68">
              {COLUMNS.slice(0, 1).map((col) => {
                const isActive = sort.key === col.key;
                return (
                  <th
                    key={col.key}
                    aria-sort={isActive ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
                    className="w-8 py-1.5 pl-2 font-medium sm:w-10 sm:pl-3"
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
              <th className="w-7 py-1.5 sm:w-9" aria-label="Watchlist" />
              {COLUMNS.slice(1).map((col) => {
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
                <td className="py-2 pl-2 tabular-nums text-panel-fg/68 sm:py-2.5 sm:pl-3">{row[rankKey]}</td>
                <td className="py-2">
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
                <td className="py-2 pr-2 text-right tabular-nums text-panel-fg sm:py-2.5 sm:pr-4">
                  {row.price == null ? <span className="text-panel-fg/65">N/A</span> : `₱${row.price.toFixed(2)}`}
                </td>
                <td className="py-2 pr-2 text-right font-medium tabular-nums sm:py-2.5 sm:pr-4">
                  <span className={changeColor(row.pctChange ?? 0)}>
                    {(row.pctChange ?? 0) >= 0 ? "+" : ""}
                    {(row.pctChange ?? 0).toFixed(2)}%
                  </span>
                </td>
                <td className="hidden py-2.5 pr-4 text-right tabular-nums text-panel-fg/70 sm:table-cell">
                  {formatMarketCap(row.marketCap)}
                </td>
                <td className="py-2 pr-2 text-right tabular-nums text-panel-fg sm:py-2.5 sm:pr-4">
                  {formatMarketCap(row.investableMarketCap)}
                  {/* Only shown when this row is actually float-adjusted (MFC/SLF) —
                      for everyone else investableMarketCap now equals marketCap, so a
                      free-float % badge next to an unadjusted number would misleadingly
                      imply this row was scaled down too. */}
                  {row.freeFloatPct != null && row.investableMarketCap !== row.marketCap && (
                    <span className="ml-1.5 hidden text-[11px] text-panel-fg/60 sm:inline">
                      {formatFreeFloat(row.freeFloatPct)}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
