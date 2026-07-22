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
  return value >= 0 ? "text-[#30cc5a]" : "text-[#f6362f]";
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
      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3 rounded-lg bg-panel p-4 ring-1 ring-panel-border">
        <div className="flex flex-col gap-1">
          <label htmlFor="portfolio-ticker" className="text-xs text-panel-fg/60">
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
          <label htmlFor="portfolio-shares" className="text-xs text-panel-fg/60">
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
          <label htmlFor="portfolio-avgcost" className="text-xs text-panel-fg/60">
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
      {error && <p className="mt-2 text-xs text-[#f6362f]">{error}</p>}

      {rows.length === 0 ? (
        <p className="mt-8 text-sm text-panel-fg/60">
          No holdings yet — add one above to see live gain/loss. Stored only in your browser; nothing
          is sent anywhere.
        </p>
      ) : (
        <>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-panel p-3 ring-1 ring-panel-border">
              <div className="text-xs text-panel-fg/50">Cost basis</div>
              <div className="mt-1 text-lg font-semibold tabular-nums text-panel-fg">{formatPeso(totalCost)}</div>
            </div>
            <div className="rounded-lg bg-panel p-3 ring-1 ring-panel-border">
              <div className="text-xs text-panel-fg/50">Market value</div>
              <div className="mt-1 text-lg font-semibold tabular-nums text-panel-fg">{formatPeso(totalValue)}</div>
            </div>
            <div className="rounded-lg bg-panel p-3 ring-1 ring-panel-border">
              <div className="text-xs text-panel-fg/50">Gain / loss</div>
              <div className={`mt-1 text-lg font-semibold tabular-nums ${changeColor(totalGainLoss)}`}>
                {totalGainLoss >= 0 ? "+" : ""}
                {formatPeso(totalGainLoss)}
              </div>
            </div>
            <div className="rounded-lg bg-panel p-3 ring-1 ring-panel-border">
              <div className="text-xs text-panel-fg/50">Gain / loss %</div>
              <div className={`mt-1 text-lg font-semibold tabular-nums ${totalGainLossPct == null ? "text-panel-fg/40" : changeColor(totalGainLossPct)}`}>
                {totalGainLossPct == null ? "N/A" : `${totalGainLossPct >= 0 ? "+" : ""}${totalGainLossPct.toFixed(2)}%`}
              </div>
            </div>
          </div>
          {missingPriceCount > 0 && (
            <p className="mt-2 text-xs text-panel-fg/50">
              {missingPriceCount} {missingPriceCount === 1 ? "holding has" : "holdings have"} no current price
              (suspended or no trade yet today) and {missingPriceCount === 1 ? "is" : "are"} excluded from the
              totals above.
            </p>
          )}

          <div className="mt-6 overflow-hidden rounded-lg bg-panel ring-1 ring-panel-border">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-panel-border text-left text-[10px] uppercase tracking-wide text-panel-fg/50">
                    <th className="py-1.5 pl-3 font-medium">Company</th>
                    <th className="py-1.5 pr-4 text-right font-medium">Shares</th>
                    <th className="py-1.5 pr-4 text-right font-medium">Avg. cost</th>
                    <th className="py-1.5 pr-4 text-right font-medium">Price</th>
                    <th className="py-1.5 pr-4 text-right font-medium">Market value</th>
                    <th className="py-1.5 pr-4 text-right font-medium">Gain / loss</th>
                    <th className="w-9 py-1.5" aria-label="Remove" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-panel-border">
                  {rows.map((row) => (
                    <tr key={row.ticker} className="transition-colors hover:bg-panel-raised">
                      <td className="py-2.5 pl-3">
                        <Link href={`/stocks/${row.ticker}`} className="text-panel-fg hover:underline">
                          <span className="font-mono text-xs font-semibold">{row.ticker}</span>
                          <span className="ml-2 text-panel-fg/70">{row.companyName}</span>
                        </Link>
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-panel-fg">{row.shares.toLocaleString("en-PH")}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-panel-fg">{formatPeso(row.avgCost)}</td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-panel-fg">
                        {row.price == null ? <span className="text-panel-fg/40">N/A</span> : formatPeso(row.price)}
                      </td>
                      <td className="py-2.5 pr-4 text-right tabular-nums text-panel-fg">
                        {row.marketValue == null ? <span className="text-panel-fg/40">N/A</span> : formatPeso(row.marketValue)}
                      </td>
                      <td className="py-2.5 pr-4 text-right font-medium tabular-nums">
                        {row.gainLoss == null ? (
                          <span className="text-panel-fg/40">N/A</span>
                        ) : (
                          <span className={changeColor(row.gainLoss)}>
                            {row.gainLoss >= 0 ? "+" : ""}
                            {formatPeso(row.gainLoss)}
                            {row.gainLossPct != null && ` (${row.gainLossPct >= 0 ? "+" : ""}${row.gainLossPct.toFixed(1)}%)`}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 pr-3 text-right">
                        <button
                          type="button"
                          onClick={() => remove(row.ticker)}
                          aria-label={`Remove ${row.ticker} from portfolio`}
                          title="Remove"
                          className="rounded p-1 text-panel-fg/40 hover:bg-panel-active hover:text-panel-fg"
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
