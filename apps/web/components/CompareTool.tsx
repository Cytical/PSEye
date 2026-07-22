"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { HistoricalClose, Quote } from "@pseye/source-quotes";
import { CompareChart, type CompareSeries } from "./CompareChart";
import { ShareButton } from "./ShareButton";

const MAX_TICKERS = 4;

function defaultStartDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().slice(0, 10);
}

/** Fired after history.replaceState so useSyncExternalStore knows to re-read the URL
 * (replaceState doesn't dispatch popstate on its own) — same pattern as MarketMap.tsx's
 * FILTER_CHANGE_EVENT, kept local here since these params (?tickers=&from=) are specific
 * to this tool. Makes a specific comparison bookmarkable/shareable via ShareButton,
 * the way ?ticker=/?filter= already do for the market map. */
const COMPARE_CHANGE_EVENT = "pseye:comparechange";

function subscribeToCompareUrl(callback: () => void) {
  window.addEventListener(COMPARE_CHANGE_EVENT, callback);
  window.addEventListener("popstate", callback);
  return () => {
    window.removeEventListener(COMPARE_CHANGE_EVENT, callback);
    window.removeEventListener("popstate", callback);
  };
}

const EMPTY_URL_TICKERS: string[] = [];

// useSyncExternalStore compares snapshots by reference (Object.is) — parsing
// the URL fresh on every call would return a new array each time even when
// `?tickers=` hasn't changed, same reasoning as lib/watchlist.ts's readTickers.
let cachedTickersParam: string | null = null;
let cachedUrlTickers: string[] = EMPTY_URL_TICKERS;

function getTickersFromUrl(): string[] {
  const param = new URLSearchParams(window.location.search).get("tickers");
  if (param === cachedTickersParam) return cachedUrlTickers;
  cachedTickersParam = param;
  if (!param) {
    cachedUrlTickers = EMPTY_URL_TICKERS;
    return cachedUrlTickers;
  }
  const tickers = param.split(",").map((t) => t.trim().toUpperCase()).filter(Boolean);
  cachedUrlTickers = tickers.length > 0 ? tickers : EMPTY_URL_TICKERS;
  return cachedUrlTickers;
}

function getStartDateFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get("from");
}

function updateCompareUrl(tickers: string[], startDate: string): void {
  const url = new URL(window.location.href);
  if (tickers.length > 0) url.searchParams.set("tickers", tickers.join(","));
  else url.searchParams.delete("tickers");
  url.searchParams.set("from", startDate);
  window.history.replaceState(null, "", url);
  window.dispatchEvent(new Event(COMPARE_CHANGE_EVENT));
}

async function fetchHistories(
  tickers: string[],
  fromDate: string
): Promise<{ source: "real" | "mock"; history: Record<string, HistoricalClose[]> }> {
  const res = await fetch(`/api/history?tickers=${encodeURIComponent(tickers.join(","))}&from=${fromDate}`);
  if (!res.ok) return { source: "mock", history: {} };
  return res.json();
}

/**
 * Native alternative to /charts (which can only show NASDAQ — TradingView
 * refuses PSE symbol data, see CLAUDE.md) built on the same /api/history
 * route the DCA calculator already uses. Compares up to MAX_TICKERS stocks'
 * normalized % price change on one chart, since raw peso prices aren't
 * comparable across companies.
 */
export function CompareTool({ quotes }: { quotes: Quote[] }) {
  const byMarketCapDesc = useMemo(() => [...quotes].sort((a, b) => b.marketCap - a.marketCap), [quotes]);
  const validTickers = useMemo(() => new Set(quotes.map((q) => q.ticker)), [quotes]);

  const urlTickers = useSyncExternalStore(subscribeToCompareUrl, getTickersFromUrl, (): string[] => EMPTY_URL_TICKERS);
  const urlStartDate = useSyncExternalStore(subscribeToCompareUrl, getStartDateFromUrl, (): string | null => null);

  // Server/hydration snapshot is always empty/null, so the first render never
  // depends on a deep-linked URL — the actual comparison (default top-2, or
  // whatever the URL specifies) only kicks in client-side, same reasoning as
  // MarketMap's filter default.
  const defaultSelected = useMemo(() => byMarketCapDesc.slice(0, 2).map((q) => q.ticker), [byMarketCapDesc]);
  const selected =
    urlTickers.length > 0 ? urlTickers.filter((t) => validTickers.has(t)).slice(0, MAX_TICKERS) : defaultSelected;
  const startDate = urlStartDate ?? defaultStartDate();

  const [pending, setPending] = useState("");
  const [series, setSeries] = useState<CompareSeries[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSampleData, setIsSampleData] = useState(false);

  const availableToAdd = byMarketCapDesc.filter((q) => !selected.includes(q.ticker));

  useEffect(() => {
    if (selected.length === 0) return;
    let cancelled = false;

    async function run() {
      setLoading(true);
      const { source, history } = await fetchHistories(selected, startDate);
      if (cancelled) return;
      setIsSampleData(source === "mock");
      setSeries(
        selected.map((ticker) => ({
          ticker,
          companyName: quotes.find((q) => q.ticker === ticker)?.companyName ?? ticker,
          closes: history[ticker] ?? [],
        }))
      );
      setLoading(false);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [selected, startDate, quotes]);

  function addTicker() {
    if (!pending || selected.length >= MAX_TICKERS) return;
    updateCompareUrl([...selected, pending], startDate);
    setPending("");
  }

  function removeTicker(ticker: string) {
    updateCompareUrl(
      selected.filter((t) => t !== ticker),
      startDate
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-panel-fg/60">Start date</span>
          <input
            type="date"
            className="rounded border border-panel-fg/15 bg-[var(--background)] px-2 py-1.5 text-[var(--panel-fg)]"
            value={startDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => e.target.value && updateCompareUrl(selected, e.target.value)}
          />
        </label>

        {selected.length > 0 && (
          <ShareButton
            shareTitle="PSE stock comparison"
            shareText={`Comparing ${selected.join(", ")} on PSEye`}
          />
        )}

        {selected.length < MAX_TICKERS && availableToAdd.length > 0 && (
          <div className="flex items-end gap-2">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-panel-fg/60">Add a stock</span>
              <select
                className="rounded border border-panel-fg/15 bg-[var(--background)] px-2 py-1.5 text-[var(--panel-fg)]"
                value={pending}
                onChange={(e) => setPending(e.target.value)}
              >
                <option value="">Select a ticker…</option>
                {availableToAdd.map((q) => (
                  <option key={q.ticker} value={q.ticker}>
                    {q.ticker} — {q.companyName}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={addTicker}
              disabled={!pending}
              className="rounded-md border border-panel-fg/10 px-3 py-1.5 text-xs font-medium hover:bg-panel-fg/5 disabled:opacity-40 dark:hover:bg-panel-fg/10"
            >
              Add
            </button>
          </div>
        )}
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((ticker) => (
            <span
              key={ticker}
              className="flex items-center gap-1.5 rounded-full border border-panel-fg/15 py-1 pl-2.5 pr-1 text-xs font-mono"
            >
              {ticker}
              <button
                type="button"
                onClick={() => removeTicker(ticker)}
                aria-label={`Remove ${ticker}`}
                className="rounded-full p-0.5 hover:bg-panel-fg/10"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}

      {selected.length === 0 && (
        <p className="text-sm text-panel-fg/50">Add at least one stock to compare.</p>
      )}

      {loading && <p className="text-sm text-panel-fg/50">Loading…</p>}

      {!loading && selected.length > 0 && series.length > 0 && <CompareChart series={series} />}

      {!loading && selected.length > 0 && isSampleData && (
        <p className="text-xs text-panel-fg/60">
          Price history is sample data for one or more of these tickers — a real EOD price
          history feed hasn&apos;t been backfilled for it yet. Results are illustrative, not
          historical fact.
        </p>
      )}
    </div>
  );
}
