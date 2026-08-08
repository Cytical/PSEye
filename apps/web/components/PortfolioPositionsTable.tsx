"use client";

import Link from "next/link";
import type { PortfolioRow } from "@/lib/portfolio";
import type { PositionNote } from "@/lib/usePortfolioNotes";

function formatPeso(value: number): string {
  return `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function changeColor(value: number): string {
  return value >= 0 ? "text-up" : "text-down";
}

/** Current derived positions (from computePositions' FIFO matcher), joined
 * against live quotes — the same shape the old single-holding table showed,
 * plus a notes/target-price affordance and a "Close" action that records a
 * sell of the full remaining position at today's price. */
export function PortfolioPositionsTable({
  rows,
  notes,
  onEditNote,
  onClosePosition,
}: {
  rows: PortfolioRow[];
  notes: Record<string, PositionNote>;
  onEditNote: (ticker: string) => void;
  onClosePosition: (ticker: string, shares: number, price: number) => void;
}) {
  return (
    <div className="overflow-hidden rounded-xl bg-panel shadow-sm shadow-black/5 ring-1 ring-panel-border">
      <div className="overflow-x-auto">
        <table className="w-full text-xs sm:min-w-[820px] sm:text-sm">
          <thead>
            <tr className="kicker border-b border-panel-border bg-panel-raised/50 text-left text-panel-fg/68">
              <th className="py-1.5 pl-2 font-medium sm:pl-3">Company</th>
              <th className="py-1.5 pr-2 text-right font-medium sm:pr-4">Shares</th>
              <th className="hidden py-1.5 pr-4 text-right font-medium sm:table-cell">Avg. cost</th>
              <th className="hidden py-1.5 pr-4 text-right font-medium sm:table-cell">Price</th>
              <th className="hidden py-1.5 pr-4 text-right font-medium sm:table-cell">Today</th>
              <th className="py-1.5 pr-2 text-right font-medium sm:pr-4">Market value</th>
              <th className="py-1.5 pr-2 text-right font-medium sm:pr-4">Gain / loss</th>
              <th className="w-16 py-1.5 sm:w-20" aria-label="Actions" />
            </tr>
          </thead>
          <tbody className="divide-y divide-panel-border">
            {rows.map((row) => {
              const note = notes[row.ticker];
              const hasNote = note && (note.note || note.targetPrice != null || note.stopLoss != null);
              const targetHit = note?.targetPrice != null && row.price != null && row.price >= note.targetPrice;
              const stopHit = note?.stopLoss != null && row.price != null && row.price <= note.stopLoss;

              return (
                <tr key={row.ticker} className="transition-colors hover:bg-panel-raised">
                  <td className="max-w-[110px] py-2 pl-2 sm:max-w-none sm:py-2.5 sm:pl-3">
                    <Link href={`/stocks/${row.ticker}`} className="flex items-center gap-1.5 text-panel-fg hover:underline">
                      <span className="shrink-0 font-mono text-[10px] font-semibold sm:text-xs">{row.ticker}</span>
                      <span className="min-w-0 flex-1 truncate text-panel-fg/70">{row.companyName}</span>
                    </Link>
                    {(targetHit || stopHit) && (
                      <div className="mt-0.5 flex gap-1">
                        {targetHit && <span className="rounded bg-up/15 px-1.5 py-0.5 text-[10px] font-medium text-up">Target hit</span>}
                        {stopHit && <span className="rounded bg-down/15 px-1.5 py-0.5 text-[10px] font-medium text-down">Stop hit</span>}
                      </div>
                    )}
                  </td>
                  <td className="py-2 pr-2 text-right tabular-nums text-panel-fg sm:py-2.5 sm:pr-4">{row.shares.toLocaleString("en-PH")}</td>
                  <td className="hidden py-2.5 pr-4 text-right tabular-nums text-panel-fg sm:table-cell">{formatPeso(row.avgCost)}</td>
                  <td className="hidden py-2.5 pr-4 text-right tabular-nums text-panel-fg sm:table-cell">
                    {row.price == null ? <span className="text-panel-fg/65">N/A</span> : formatPeso(row.price)}
                  </td>
                  <td className="hidden py-2.5 pr-4 text-right tabular-nums sm:table-cell">
                    {row.dayChange == null || row.pctChange == null ? (
                      <span className="text-panel-fg/65">N/A</span>
                    ) : (
                      <span className={changeColor(row.dayChange)}>
                        {row.dayChange >= 0 ? "+" : ""}
                        {formatPeso(row.dayChange)} ({row.pctChange >= 0 ? "+" : ""}
                        {row.pctChange.toFixed(2)}%)
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-2 text-right tabular-nums text-panel-fg sm:py-2.5 sm:pr-4">
                    {row.marketValue == null ? <span className="text-panel-fg/65">N/A</span> : formatPeso(row.marketValue)}
                  </td>
                  <td className="py-2 pr-2 text-right font-medium tabular-nums sm:py-2.5 sm:pr-4">
                    {row.gainLoss == null ? (
                      <span className="text-panel-fg/65">N/A</span>
                    ) : (
                      <span className={changeColor(row.gainLoss)}>
                        {row.gainLoss >= 0 ? "+" : ""}
                        {formatPeso(row.gainLoss)}
                        {row.gainLossPct != null && ` (${row.gainLossPct >= 0 ? "+" : ""}${row.gainLossPct.toFixed(1)}%)`}
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-2 text-right sm:py-2.5 sm:pr-3">
                    <div className="flex items-center justify-end gap-0.5">
                      <button
                        type="button"
                        onClick={() => onEditNote(row.ticker)}
                        aria-label={`Notes and targets for ${row.ticker}`}
                        title={hasNote ? "Edit notes/targets" : "Add notes/targets"}
                        className={`rounded p-1 hover:bg-panel-active ${hasNote ? "text-accent" : "text-panel-fg/65 hover:text-panel-fg"}`}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      {row.price != null && (
                        <button
                          type="button"
                          onClick={() => onClosePosition(row.ticker, row.shares, row.price!)}
                          aria-label={`Close ${row.ticker} position`}
                          title="Close position (records a sell at today's price)"
                          className="rounded p-1 text-panel-fg/65 hover:bg-panel-active hover:text-panel-fg"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
