"use client";

import { useEffect, useMemo, useState } from "react";
import type { HistoricalClose, Quote } from "@pseye/source-quotes";
import { buildCompositeHistory } from "@/lib/dca";
import { computePortfolioHistory, computePortfolioRows } from "@/lib/portfolio";
import { usePortfolioTransactions } from "@/lib/usePortfolioTransactions";
import { usePortfolioNotes } from "@/lib/usePortfolioNotes";
import { useIsHydrated } from "@/lib/watchlist";
import { computeDividendIncome } from "@/lib/dividendIncome";
import type { DividendScreenerRow } from "@/lib/dividends";
import { alignPortfolioToBenchmark } from "@/lib/portfolioBenchmark";
import { computeHoldingsCorrelation, computePortfolioBeta } from "@/lib/portfolioRisk";
import { PortfolioHistoryChart } from "./PortfolioHistoryChart";
import { PortfolioBenchmarkChart } from "./PortfolioBenchmarkChart";
import { PortfolioCorrelationHeatmap } from "./PortfolioCorrelationHeatmap";
import { DividendIncomePanel } from "./DividendIncomePanel";
import { TransactionForm } from "./TransactionForm";
import { TransactionLog } from "./TransactionLog";
import { PortfolioPositionsTable } from "./PortfolioPositionsTable";
import { PositionNoteModal } from "./PositionNoteModal";

/** How far back the history/benchmark charts look. Matches the DCA
 * calculator's default window order of magnitude — far enough to show a real
 * trend, not so far that thinly-traded tickers drop lots of shared dates. */
const HISTORY_DAYS = 180;

function formatPeso(value: number): string {
  return `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function changeColor(value: number): string {
  return value >= 0 ? "text-up" : "text-down";
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

async function fetchHistories(url: string): Promise<Record<string, HistoricalClose[]>> {
  try {
    const res = await fetch(url);
    if (!res.ok) return {};
    const data: { history?: Record<string, HistoricalClose[]> } = await res.json();
    return data.history ?? {};
  } catch {
    return {};
  }
}

/**
 * Client-only portfolio: a real buy/sell transaction log (usePortfolioTransactions,
 * FIFO-matched into current positions by lib/transactions.ts), live P&L against
 * the quotes the server component fetched, plus benchmark/risk analytics and a
 * projected dividend income panel. Everything lives in localStorage only
 * (same no-backend contract as the watchlist star) — nothing here ever leaves
 * the browser.
 */
export function PortfolioTracker({ quotes, dividendRows }: { quotes: Quote[]; dividendRows: DividendScreenerRow[] }) {
  const hydrated = useIsHydrated();
  const { transactions, positions, totalRealizedGain, addTransaction, addTransactions, removeTransaction } = usePortfolioTransactions();
  const { notes, setNote } = usePortfolioNotes();
  const [editingNoteTicker, setEditingNoteTicker] = useState<string | null>(null);

  const {
    rows,
    totalCost,
    totalValue,
    totalGainLoss,
    totalGainLossPct,
    totalDayChange,
    totalDayChangePct,
    bestPerformer,
    worstPerformer,
    sectorAllocation,
    missingPriceCount,
  } = useMemo(() => computePortfolioRows(positions, quotes), [positions, quotes]);

  // Sorted, comma-joined so the effects below only re-fire when the actual set
  // of tickers changes, not on every shares/price edit to an existing one.
  const tickerKey = useMemo(() => Array.from(new Set(positions.map((p) => p.ticker))).sort().join(","), [positions]);
  const allTickersKey = useMemo(() => quotes.map((q) => q.ticker).join(","), [quotes]);
  const [historyByTicker, setHistoryByTicker] = useState<Record<string, HistoricalClose[]>>({});
  const [compositeHistory, setCompositeHistory] = useState<HistoricalClose[]>([]);

  useEffect(() => {
    // No setState here when tickerKey is empty: computePortfolioHistory below
    // filters by the (now-empty) positions list regardless of stale
    // historyByTicker content, so there's nothing to clear.
    if (!tickerKey) return;
    let cancelled = false;
    const from = new Date(Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    fetchHistories(`/api/portfolio-history?tickers=${encodeURIComponent(tickerKey)}&from=${from}`).then((history) => {
      if (!cancelled) setHistoryByTicker(history);
    });
    return () => {
      cancelled = true;
    };
  }, [tickerKey]);

  useEffect(() => {
    // Benchmark composite needs at least one holding to be worth fetching —
    // this is the same all-282-ticker request the DCA calculator's PSEi proxy
    // option already makes, so the cost is an accepted, established one here.
    if (!tickerKey || !allTickersKey) return;
    let cancelled = false;
    const from = new Date(Date.now() - HISTORY_DAYS * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    fetchHistories(`/api/history?tickers=${encodeURIComponent(allTickersKey)}&from=${from}`).then((history) => {
      if (cancelled) return;
      const tickers = allTickersKey.split(",");
      setCompositeHistory(buildCompositeHistory(tickers.map((t) => history[t] ?? [])));
    });
    return () => {
      cancelled = true;
    };
  }, [tickerKey, allTickersKey]);

  const portfolioHistory = useMemo(() => computePortfolioHistory(positions, historyByTicker), [positions, historyByTicker]);
  const benchmarkPoints = useMemo(() => alignPortfolioToBenchmark(portfolioHistory, compositeHistory), [portfolioHistory, compositeHistory]);

  const portfolioBeta = useMemo(() => {
    const inputs = rows.filter((r) => r.marketValue != null).map((r) => ({ ticker: r.ticker, marketValue: r.marketValue!, closes: historyByTicker[r.ticker] ?? [] }));
    return computePortfolioBeta(inputs, compositeHistory);
  }, [rows, historyByTicker, compositeHistory]);

  const correlationMatrix = useMemo(() => {
    const inputs = rows.filter((r) => (historyByTicker[r.ticker]?.length ?? 0) > 0).map((r) => ({ ticker: r.ticker, closes: historyByTicker[r.ticker] }));
    return inputs.length >= 2 ? computeHoldingsCorrelation(inputs) : null;
  }, [rows, historyByTicker]);

  const dividendIncome = useMemo(() => {
    const marketValueByTicker = new Map(rows.filter((r) => r.marketValue != null).map((r) => [r.ticker, r.marketValue!]));
    return computeDividendIncome(positions, dividendRows, marketValueByTicker);
  }, [positions, dividendRows, rows]);

  function handleClosePosition(ticker: string, shares: number, price: number) {
    addTransaction({ ticker, type: "sell", shares, price, date: todayIso() });
  }

  return (
    <div>
      <TransactionForm transactions={transactions} onAdd={addTransaction} onImport={addTransactions} />

      {!hydrated ? null : rows.length === 0 ? (
        <p className="mt-8 text-sm text-panel-fg/72">
          No holdings yet. Add a buy above to see live gain/loss. Stored only in your browser; nothing is sent anywhere.
        </p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7">
            <div className="rounded-xl bg-panel p-3 shadow-sm shadow-black/5 ring-1 ring-panel-border">
              <div className="text-xs text-panel-fg/68">Cost basis</div>
              <div className="mt-1 text-lg font-semibold tabular-nums text-panel-fg">{formatPeso(totalCost)}</div>
            </div>
            <div className="rounded-xl bg-panel p-3 shadow-sm shadow-black/5 ring-1 ring-panel-border">
              <div className="text-xs text-panel-fg/68">Market value</div>
              <div className="mt-1 text-lg font-semibold tabular-nums text-panel-fg">{formatPeso(totalValue)}</div>
            </div>
            <div className="rounded-xl bg-panel p-3 shadow-sm shadow-black/5 ring-1 ring-panel-border">
              <div className="text-xs text-panel-fg/68">Gain / loss</div>
              <div className={`mt-1 text-lg font-semibold tabular-nums ${changeColor(totalGainLoss)}`}>
                {totalGainLoss >= 0 ? "+" : ""}
                {formatPeso(totalGainLoss)}
              </div>
            </div>
            <div className="rounded-xl bg-panel p-3 shadow-sm shadow-black/5 ring-1 ring-panel-border">
              <div className="text-xs text-panel-fg/68">Gain / loss %</div>
              <div className={`mt-1 text-lg font-semibold tabular-nums ${totalGainLossPct == null ? "text-panel-fg/65" : changeColor(totalGainLossPct)}`}>
                {totalGainLossPct == null ? "N/A" : `${totalGainLossPct >= 0 ? "+" : ""}${totalGainLossPct.toFixed(2)}%`}
              </div>
            </div>
            {/* Distinct from Gain/loss above: that's the move since avgCost, this
                is just today's move — the number a daily check-in actually wants. */}
            <div className="rounded-xl bg-panel p-3 shadow-sm shadow-black/5 ring-1 ring-panel-border">
              <div className="text-xs text-panel-fg/68">Today&apos;s change</div>
              <div className={`mt-1 text-lg font-semibold tabular-nums ${changeColor(totalDayChange)}`}>
                {totalDayChange >= 0 ? "+" : ""}
                {formatPeso(totalDayChange)}
              </div>
            </div>
            <div className="rounded-xl bg-panel p-3 shadow-sm shadow-black/5 ring-1 ring-panel-border">
              <div className="text-xs text-panel-fg/68">Today&apos;s change %</div>
              <div className={`mt-1 text-lg font-semibold tabular-nums ${totalDayChangePct == null ? "text-panel-fg/65" : changeColor(totalDayChangePct)}`}>
                {totalDayChangePct == null ? "N/A" : `${totalDayChangePct >= 0 ? "+" : ""}${totalDayChangePct.toFixed(2)}%`}
              </div>
            </div>
            {/* From closed positions only (realizedGains, FIFO-matched) — separate
                from the unrealized Gain/loss tiles above, which are marked-to-market
                on what's still held. Always shown, even at 0, once there's a
                transaction log at all: a portfolio that's never sold anything has a
                real, meaningful ₱0 here, not a missing figure. */}
            <div className="rounded-xl bg-panel p-3 shadow-sm shadow-black/5 ring-1 ring-panel-border">
              <div className="text-xs text-panel-fg/68">Realized gain (all-time)</div>
              <div className={`mt-1 text-lg font-semibold tabular-nums ${changeColor(totalRealizedGain)}`}>
                {totalRealizedGain >= 0 ? "+" : ""}
                {formatPeso(totalRealizedGain)}
              </div>
            </div>
          </div>
          {missingPriceCount > 0 && (
            <p className="mt-2 text-xs text-panel-fg/68">
              {missingPriceCount} {missingPriceCount === 1 ? "holding has" : "holdings have"} no current price
              (suspended or no trade yet today) and {missingPriceCount === 1 ? "is" : "are"} excluded from the
              totals above.
            </p>
          )}

          {(bestPerformer || worstPerformer || sectorAllocation.length > 0) && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {(bestPerformer || worstPerformer) && (
                <div className="rounded-xl bg-panel p-4 shadow-sm shadow-black/5 ring-1 ring-panel-border">
                  <div className="kicker text-panel-fg/68">Today&apos;s movers</div>
                  <div className="mt-2 flex flex-col gap-2 text-sm">
                    {bestPerformer && (
                      <div className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1">
                        <span className="text-panel-fg/72">Best: {bestPerformer.ticker}</span>
                        <span className={`font-medium tabular-nums ${changeColor(bestPerformer.pctChange!)}`}>
                          {bestPerformer.pctChange! >= 0 ? "+" : ""}
                          {bestPerformer.pctChange!.toFixed(2)}%
                        </span>
                      </div>
                    )}
                    {worstPerformer && worstPerformer.ticker !== bestPerformer?.ticker && (
                      <div className="flex items-center justify-between gap-2 rounded-md px-1.5 py-1">
                        <span className="text-panel-fg/72">Worst: {worstPerformer.ticker}</span>
                        <span className={`font-medium tabular-nums ${changeColor(worstPerformer.pctChange!)}`}>
                          {worstPerformer.pctChange! >= 0 ? "+" : ""}
                          {worstPerformer.pctChange!.toFixed(2)}%
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {sectorAllocation.length > 0 && (
                <div className="rounded-xl bg-panel p-4 shadow-sm shadow-black/5 ring-1 ring-panel-border">
                  <div className="kicker text-panel-fg/68">Sector allocation</div>
                  <div className="mt-2 flex flex-col gap-1.5">
                    {sectorAllocation.map((s) => (
                      <div key={s.sector} className="flex items-center gap-2 text-xs">
                        <span className="w-28 shrink-0 truncate text-panel-fg/72">{s.sector}</span>
                        <span className="h-2 flex-1 overflow-hidden rounded-full bg-panel-raised">
                          <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.max(s.pct, 2)}%` }} />
                        </span>
                        <span className="w-10 shrink-0 text-right tabular-nums text-panel-fg">{s.pct.toFixed(0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="mt-4">
            <DividendIncomePanel summary={dividendIncome} />
          </div>

          {(portfolioBeta != null || correlationMatrix) && (
            <div className="mt-4 rounded-xl bg-panel p-4 shadow-sm shadow-black/5 ring-1 ring-panel-border">
              <div className="kicker text-panel-fg/68">Risk</div>
              {portfolioBeta != null && (
                <p className="mt-2 text-sm text-panel-fg/72">
                  Portfolio beta vs. the PSEi proxy:{" "}
                  <span className="font-semibold tabular-nums text-panel-fg">{portfolioBeta.toFixed(2)}</span>
                  {portfolioBeta > 1 ? " — more volatile than the market." : portfolioBeta < 1 && portfolioBeta > 0 ? " — less volatile than the market." : ""}
                </p>
              )}
              {correlationMatrix && (
                <div className="mt-3">
                  <p className="text-xs text-panel-fg/65">
                    How your holdings move together — two stocks can sit in different sectors and still track each other closely.
                  </p>
                  <div className="mt-2">
                    <PortfolioCorrelationHeatmap data={correlationMatrix} />
                  </div>
                </div>
              )}
            </div>
          )}

          {benchmarkPoints.length > 1 && (
            <div className="mt-4 rounded-xl bg-panel p-4 shadow-sm shadow-black/5 ring-1 ring-panel-border">
              <div className="kicker text-panel-fg/68">Your return vs. the market, last {HISTORY_DAYS} days</div>
              <div className="mt-3">
                <PortfolioBenchmarkChart points={benchmarkPoints} />
              </div>
            </div>
          )}

          {portfolioHistory.length > 1 && (
            <div className="mt-4 rounded-xl bg-panel p-4 shadow-sm shadow-black/5 ring-1 ring-panel-border">
              <div className="kicker text-panel-fg/68">Value of your current holdings, last {HISTORY_DAYS} days</div>
              <div className="mt-3">
                <PortfolioHistoryChart history={portfolioHistory} costBasis={totalCost} />
              </div>
            </div>
          )}

          <div className="mt-6">
            <PortfolioPositionsTable
              rows={rows}
              notes={notes}
              onEditNote={(ticker) => setEditingNoteTicker(ticker)}
              onClosePosition={handleClosePosition}
            />
          </div>
        </>
      )}

      <div className="mt-6">
        <TransactionLog transactions={transactions} onRemove={removeTransaction} />
      </div>

      {editingNoteTicker && (
        <PositionNoteModal
          ticker={editingNoteTicker}
          initial={notes[editingNoteTicker] ?? { note: "", targetPrice: null, stopLoss: null }}
          onSave={(patch) => setNote(editingNoteTicker, patch)}
          onClose={() => setEditingNoteTicker(null)}
        />
      )}
    </div>
  );
}
