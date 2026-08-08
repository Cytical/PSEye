"use client";

import { useState } from "react";
import type { Transaction } from "@/lib/transactions";
import { transactionsToCsv } from "@/lib/portfolioCsv";

function formatPeso(value: number): string {
  return `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function downloadCsv(csv: string, filename: string): void {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/** Full buy/sell log, newest first, with per-row delete and a CSV export —
 * the record computePositions derives everything else from. Deleting a
 * mistaken entry here is the only way to correct a position once entered;
 * there's no separate "edit a holding" affordance under the transaction-log
 * model. */
export function TransactionLog({ transactions, onRemove }: { transactions: Transaction[]; onRemove: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  if (transactions.length === 0) return null;

  const sorted = [...transactions].sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id));
  const visible = expanded ? sorted : sorted.slice(0, 5);

  return (
    <div className="rounded-xl bg-panel p-4 shadow-sm shadow-black/5 ring-1 ring-panel-border">
      <div className="flex items-center justify-between gap-3">
        <div className="kicker text-panel-fg/68">Transaction history</div>
        <button
          type="button"
          onClick={() => downloadCsv(transactionsToCsv(transactions), "pseye-portfolio-transactions.csv")}
          className="rounded-md px-2.5 py-1 text-xs font-medium text-panel-fg ring-1 ring-panel-border transition-colors hover:bg-panel-raised"
        >
          Export CSV
        </button>
      </div>

      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="kicker border-b border-panel-border text-left text-panel-fg/68">
              <th className="py-1 pr-2 font-medium">Date</th>
              <th className="py-1 pr-2 font-medium">Ticker</th>
              <th className="py-1 pr-2 font-medium">Type</th>
              <th className="py-1 pr-2 text-right font-medium">Shares</th>
              <th className="py-1 pr-2 text-right font-medium">Price</th>
              <th className="py-1 pr-2 text-right font-medium">Total</th>
              <th className="w-7 py-1" aria-label="Remove" />
            </tr>
          </thead>
          <tbody className="divide-y divide-panel-border">
            {visible.map((t) => (
              <tr key={t.id}>
                <td className="py-1.5 pr-2 tabular-nums text-panel-fg/72">{t.date}</td>
                <td className="py-1.5 pr-2 font-mono font-semibold text-panel-fg">{t.ticker}</td>
                <td className={`py-1.5 pr-2 font-medium ${t.type === "buy" ? "text-up" : "text-down"}`}>
                  {t.type === "buy" ? "Buy" : "Sell"}
                </td>
                <td className="py-1.5 pr-2 text-right tabular-nums text-panel-fg">{t.shares.toLocaleString("en-PH")}</td>
                <td className="py-1.5 pr-2 text-right tabular-nums text-panel-fg">{formatPeso(t.price)}</td>
                <td className="py-1.5 pr-2 text-right tabular-nums text-panel-fg">{formatPeso(t.shares * t.price)}</td>
                <td className="py-1.5 pr-2 text-right">
                  <button
                    type="button"
                    onClick={() => onRemove(t.id)}
                    aria-label={`Remove this ${t.type} of ${t.ticker}`}
                    title="Remove"
                    className="rounded p-1 text-panel-fg/65 hover:bg-panel-active hover:text-panel-fg"
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sorted.length > 5 && (
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="mt-2 text-xs font-medium text-panel-fg/72 underline hover:text-panel-fg"
        >
          {expanded ? "Show fewer" : `Show all ${sorted.length}`}
        </button>
      )}
    </div>
  );
}
