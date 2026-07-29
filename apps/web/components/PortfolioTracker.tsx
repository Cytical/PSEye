"use client";

import { useId, useState } from "react";
import Link from "next/link";
import type { Quote } from "@pseye/source-quotes";
import { PSE_EDGE_COMPANIES } from "@pseye/source-quotes";
import { computePortfolioRows } from "@/lib/portfolio";
import { usePortfolioHoldings } from "@/lib/usePortfolioHoldings";

const TICKER_SET = new Set(PSE_EDGE_COMPANIES.map((c) => c.ticker));

function formatPeso(value: number): string {
  return `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function changeColor(value: number): string {
  return value >= 0 ? "text-up" : "text-down";
}

/**
 * Client-only portfolio: add ticker + shares + average cost, see live P&L
 * against the quotes the server component fetched. Holdings live in
 * localStorage only (usePortfolioHoldings, same no-backend contract as the
 * watchlist star) — nothing here ever leaves the browser.
 */
export function PortfolioTracker({ quotes }: { quotes: Quote[] }) {
  const { holdings, upsert, remove } = usePortfolioHoldings();
  const { rows, totalCost, totalValue, totalGainLoss, totalGainLossPct, missingPriceCount } = computePortfolioRows(
    holdings,
    quotes
  );

  const [ticker, setTicker] = useState("");
  const [shares, setShares] = useState("");
  const [avgCost, setAvgCost] = useState("");
  const [error, setError] = useState<string | null>(null);
  const datalistId = useId();

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const normalizedTicker = ticker.trim().toUpperCase();
    const sharesNum = Number(shares);
    const avgCostNum = Number(avgCost);

    if (!TICKER_SET.has(normalizedTicker)) {
      setError(`"${ticker}" isn't a tracked PSE ticker.`);
      return;
    }
    if (!Number.isFinite(sharesNum) || sharesNum <= 0) {
      setError("Shares must be a positive number.");
      return;
    }
    if (!Number.isFinite(avgCostNum) || avgCostNum <= 0) {
      setError("Average cost must be a positive number.");
      return;
    }

    upsert(normalizedTicker, sharesNum, avgCostNum);
    setTicker("");
    setShares("");
    setAvgCost("");
    setError(null);
  }

  return (
    <div>
      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3 rounded-xl bg-panel p-4 shadow-sm shadow-black/5 ring-1 ring-panel-border">
        <div className="flex flex-col gap-1">
          <label htmlFor="portfolio-ticker" className="text-xs text-panel-fg/72">
            Ticker
          </label>
          <input
            id="portfolio-ticker"
            list={datalistId}
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="e.g. BDO"
            className="w-32 rounded-md border border-foreground/15 bg-transparent px-2.5 py-1.5 text-sm uppercase"
          />
          <datalist id={datalistId}>
            {PSE_EDGE_COMPANIES.map((c) => (
              <option key={c.ticker} value={c.ticker}>
                {c.companyName}
              </option>
            ))}
          </datalist>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="portfolio-shares" className="text-xs text-panel-fg/72">
            Shares
          </label>
          <input
            id="portfolio-shares"
            type="number"
            min="0"
            step="1"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            placeholder="100"
            className="w-28 rounded-md border border-foreground/15 bg-transparent px-2.5 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="portfolio-avgcost" className="text-xs text-panel-fg/72">
            Avg. cost (₱/share)
          </label>
          <input
            id="portfolio-avgcost"
            type="number"
            min="0"
            step="0.01"
            value={avgCost}
            onChange={(e) => setAvgCost(e.target.value)}
            placeholder="120.50"
            className="w-32 rounded-md border border-foreground/15 bg-transparent px-2.5 py-1.5 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-md bg-foreground px-4 py-1.5 text-sm font-medium text-background hover:opacity-90"
        >
          Add holding
        </button>
      </form>
      {error && <p className="mt-2 text-xs text-down">{error}</p>}

      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-panel-fg/72">
          No holdings yet — add one above to see live gain/loss. Stored only in your browser; nothing
          is sent anywhere.
        </p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
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
          </div>
          {missingPriceCount > 0 && (
            <p className="mt-2 text-xs text-panel-fg/68">
              {missingPriceCount} {missingPriceCount === 1 ? "holding has" : "holdings have"} no current price
              (suspended or no trade yet today) and {missingPriceCount === 1 ? "is" : "are"} excluded from the
              totals above.
            </p>
          )}

          <div className="mt-6 overflow-hidden rounded-xl bg-panel shadow-sm shadow-black/5 ring-1 ring-panel-border">
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:min-w-[720px] sm:text-sm">
                <thead>
                  <tr className="kicker border-b border-panel-border bg-panel-raised/50 text-left text-panel-fg/68">
                    <th className="py-1.5 pl-2 font-medium sm:pl-3">Company</th>
                    <th className="py-1.5 pr-2 text-right font-medium sm:pr-4">Shares</th>
                    {/* Avg. cost and Price are hidden below sm — both are already
                        folded into Gain/loss's % figure, so a phone can skip
                        straight to Market value and Gain/loss without scrolling
                        past the two inputs those are computed from. */}
                    <th className="hidden py-1.5 pr-4 text-right font-medium sm:table-cell">Avg. cost</th>
                    <th className="hidden py-1.5 pr-4 text-right font-medium sm:table-cell">Price</th>
                    <th className="py-1.5 pr-2 text-right font-medium sm:pr-4">Market value</th>
                    <th className="py-1.5 pr-2 text-right font-medium sm:pr-4">Gain / loss</th>
                    <th className="w-7 py-1.5 sm:w-9" aria-label="Remove" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-panel-border">
                  {rows.map((row) => (
                    <tr key={row.ticker} className="transition-colors hover:bg-panel-raised">
                      <td className="max-w-[110px] py-2 pl-2 sm:max-w-none sm:py-2.5 sm:pl-3">
                        <Link
                          href={`/stocks/${row.ticker}`}
                          className="flex items-center gap-1.5 text-panel-fg hover:underline"
                        >
                          <span className="shrink-0 font-mono text-[10px] font-semibold sm:text-xs">{row.ticker}</span>
                          <span className="min-w-0 flex-1 truncate text-panel-fg/70">{row.companyName}</span>
                        </Link>
                      </td>
                      <td className="py-2 pr-2 text-right tabular-nums text-panel-fg sm:py-2.5 sm:pr-4">
                        {row.shares.toLocaleString("en-PH")}
                      </td>
                      <td className="hidden py-2.5 pr-4 text-right tabular-nums text-panel-fg sm:table-cell">
                        {formatPeso(row.avgCost)}
                      </td>
                      <td className="hidden py-2.5 pr-4 text-right tabular-nums text-panel-fg sm:table-cell">
                        {row.price == null ? <span className="text-panel-fg/65">N/A</span> : formatPeso(row.price)}
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
                        <button
                          type="button"
                          onClick={() => remove(row.ticker)}
                          aria-label={`Remove ${row.ticker} from portfolio`}
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
          </div>
        </>
      )}
    </div>
  );
}
