"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { DividendScreenerRow } from "@/lib/dividends";

type SortKey = "ticker" | "price" | "ttmDividend" | "yieldPct" | "payoutCount" | "nextExDate";

interface SortState {
  key: SortKey;
  dir: "asc" | "desc";
}

/** Numeric columns default to descending on first click (biggest first is what a screener is for); text/date to ascending. */
const DEFAULT_DIR: Record<SortKey, "asc" | "desc"> = {
  ticker: "asc",
  price: "desc",
  ttmDividend: "desc",
  yieldPct: "desc",
  payoutCount: "desc",
  nextExDate: "asc",
};

const COLUMNS: { key: SortKey; label: string; numeric: boolean; hideOnMobile?: boolean }[] = [
  { key: "ticker", label: "Company", numeric: false },
  { key: "price", label: "Price", numeric: true, hideOnMobile: true },
  // Hidden below sm alongside Payouts: Yield is the derived figure a dividend
  // screener is actually sorted/searched by, so the raw per-share peso amount
  // and the payout count are the two safe columns to drop first on a phone.
  { key: "ttmDividend", label: "Dividends / share (12M)", numeric: true, hideOnMobile: true },
  { key: "yieldPct", label: "Yield", numeric: true },
  { key: "payoutCount", label: "Payouts", numeric: true, hideOnMobile: true },
  { key: "nextExDate", label: "Next ex-date", numeric: false },
];

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Nulls always sort last regardless of direction — a missing value is never "the biggest". */
function compare(a: DividendScreenerRow, b: DividendScreenerRow, { key, dir }: SortState): number {
  const av = a[key];
  const bv = b[key];
  if (av === null && bv === null) return a.ticker.localeCompare(b.ticker);
  if (av === null) return 1;
  if (bv === null) return -1;
  const cmp = typeof av === "number" && typeof bv === "number" ? av - bv : String(av).localeCompare(String(bv));
  return dir === "asc" ? cmp : -cmp;
}

export function DividendScreenerTable({ rows }: { rows: DividendScreenerRow[] }) {
  const [sort, setSort] = useState<SortState>({ key: "yieldPct", dir: "desc" });

  const sorted = useMemo(() => [...rows].sort((a, b) => compare(a, b, sort)), [rows, sort]);

  function toggleSort(key: SortKey) {
    setSort((prev) =>
      prev.key === key ? { key, dir: prev.dir === "asc" ? "desc" : "asc" } : { key, dir: DEFAULT_DIR[key] }
    );
  }

  return (
    <div className="overflow-hidden rounded-xl bg-panel shadow-sm shadow-black/5 ring-1 ring-panel-border">
      <div className="overflow-x-auto">
        <table className="w-full text-xs sm:min-w-[720px] sm:text-sm">
          <thead>
            <tr className="kicker border-b border-panel-border bg-panel-raised/50 text-left text-panel-fg/68">
              {COLUMNS.map((col) => {
                const isActive = sort.key === col.key;
                return (
                  <th
                    key={col.key}
                    aria-sort={isActive ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
                    className={`py-1.5 ${col.key === "ticker" ? "pl-3 sm:pl-4" : ""} pr-2 font-medium sm:pr-4 ${
                      col.numeric ? "text-right" : ""
                    } ${col.hideOnMobile ? "hidden sm:table-cell" : ""}`}
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
                <td className="max-w-[150px] py-2 pl-3 pr-2 sm:max-w-none sm:py-2.5 sm:pl-4 sm:pr-4">
                  <Link
                    href={`/stocks/${row.ticker}`}
                    className="flex items-center gap-1.5 text-panel-fg hover:underline"
                  >
                    <span className="shrink-0 font-mono text-[10px] font-semibold sm:text-xs">{row.ticker}</span>
                    <span className="min-w-0 flex-1 truncate text-panel-fg/70">{row.companyName}</span>
                  </Link>
                </td>
                <td className="hidden py-2.5 pr-4 text-right tabular-nums text-panel-fg sm:table-cell">
                  {row.price == null ? <span className="text-panel-fg/65">N/A</span> : `₱${row.price.toFixed(2)}`}
                </td>
                <td className="hidden py-2.5 pr-4 text-right tabular-nums text-panel-fg sm:table-cell">
                  {row.ttmDividend > 0 ? `₱${row.ttmDividend.toFixed(4).replace(/\.?0+$/, "")}` : <span className="text-panel-fg/65">N/A</span>}
                </td>
                <td className="py-2 pr-2 text-right font-medium tabular-nums sm:py-2.5 sm:pr-4">
                  {row.yieldPct == null ? (
                    <span className="text-panel-fg/65">N/A</span>
                  ) : (
                    <span className={row.yieldPct >= 4 ? "text-up" : "text-panel-fg"}>{row.yieldPct.toFixed(2)}%</span>
                  )}
                </td>
                <td className="hidden py-2.5 pr-4 text-right tabular-nums text-panel-fg/70 sm:table-cell">
                  {row.payoutCount || "N/A"}
                </td>
                <td className="py-2 pr-2 whitespace-nowrap text-panel-fg/70 sm:py-2.5 sm:pr-4">
                  {row.nextExDate ? (
                    <>
                      {formatDate(row.nextExDate)}
                      {row.nextAmount != null && (
                        <span className="ml-1.5 hidden text-xs text-panel-fg/68 sm:inline">₱{row.nextAmount}</span>
                      )}
                    </>
                  ) : (
                    <span className="text-panel-fg/65">N/A</span>
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
