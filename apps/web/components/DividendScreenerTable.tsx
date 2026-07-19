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

const COLUMNS: { key: SortKey; label: string; numeric: boolean }[] = [
  { key: "ticker", label: "Company", numeric: false },
  { key: "price", label: "Price", numeric: true },
  { key: "ttmDividend", label: "Dividends / share (12M)", numeric: true },
  { key: "yieldPct", label: "Yield", numeric: true },
  { key: "payoutCount", label: "Payouts", numeric: true },
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
    <div className="overflow-hidden rounded-lg bg-panel ring-1 ring-panel-border">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-panel-border text-left text-[10px] uppercase tracking-wide text-panel-fg/50">
              {COLUMNS.map((col) => {
                const isActive = sort.key === col.key;
                return (
                  <th
                    key={col.key}
                    aria-sort={isActive ? (sort.dir === "asc" ? "ascending" : "descending") : undefined}
                    className={`py-1.5 ${col.key === "ticker" ? "pl-4" : ""} pr-4 font-medium ${col.numeric ? "text-right" : ""}`}
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
                <td className="py-2.5 pl-4 pr-4">
                  <Link href={`/stocks/${row.ticker}`} className="text-panel-fg hover:underline">
                    <span className="font-mono text-xs font-semibold">{row.ticker}</span>
                    <span className="ml-2 text-panel-fg/70">{row.companyName}</span>
                  </Link>
                </td>
                <td className="py-2.5 pr-4 text-right tabular-nums text-panel-fg">
                  {row.price == null ? <span className="text-panel-fg/40">N/A</span> : `₱${row.price.toFixed(2)}`}
                </td>
                <td className="py-2.5 pr-4 text-right tabular-nums text-panel-fg">
                  {row.ttmDividend > 0 ? `₱${row.ttmDividend.toFixed(4).replace(/\.?0+$/, "")}` : <span className="text-panel-fg/40">—</span>}
                </td>
                <td className="py-2.5 pr-4 text-right font-medium tabular-nums">
                  {row.yieldPct == null ? (
                    <span className="text-panel-fg/40">—</span>
                  ) : (
                    <span className={row.yieldPct >= 4 ? "text-[#30cc5a]" : "text-panel-fg"}>{row.yieldPct.toFixed(2)}%</span>
                  )}
                </td>
                <td className="py-2.5 pr-4 text-right tabular-nums text-panel-fg/70">{row.payoutCount || "—"}</td>
                <td className="py-2.5 pr-4 whitespace-nowrap text-panel-fg/70">
                  {row.nextExDate ? (
                    <>
                      {formatDate(row.nextExDate)}
                      {row.nextAmount != null && (
                        <span className="ml-1.5 text-xs text-panel-fg/50">₱{row.nextAmount}</span>
                      )}
                    </>
                  ) : (
                    <span className="text-panel-fg/40">—</span>
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
