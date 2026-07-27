"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { TreemapChart, type TreemapStock } from "./TreemapChart";
import { MarketSummaryBar } from "./MarketSummaryBar";
import { TopMovers } from "./TopMovers";
import { AddToWatchlistModal } from "./AddToWatchlistModal";
import { ShareButton } from "./ShareButton";
import { FullscreenButton } from "./FullscreenButton";
import { CalendarDatePicker } from "@/components/CalendarDatePicker";
import { MARKET_MAP_FILTERS, filterMarketMapStocks, type MarketMapFilter } from "@/lib/marketMapFilters";
import { NASDAQ_100_STOCKS } from "@/lib/nasdaq100";
import { useWatchlist } from "@/lib/watchlist";
import { useColorblindMode, setColorblindMode } from "@/lib/colorblindMode";
import type { CompanyProfile } from "@/lib/companyProfiles";
import type { MarketSnapshot } from "@/lib/marketSnapshot";
import type { LatestForeignFlow } from "@/lib/latestForeignFlow";

interface MarketMapProps {
  stocks: TreemapStock[];
  /** Ticker -> one-time-fetched company description, pre-fetched once server-side so the click-to-detail panel never waits on a network request. */
  profileByTicker?: Record<string, CompanyProfile>;
  snapshot: MarketSnapshot;
  foreignFlow: LatestForeignFlow;
  /** Ticker -> real trailing-month closes for the hover sparkline (see lib/sparklines.ts); tickers without real history are absent. */
  sparklineByTicker?: Record<string, number[]>;
}

const FILTER_KEYS = new Set(MARKET_MAP_FILTERS.map((f) => f.key));

/** Reserved pixels below the canvas in fullscreen — the "Day change" legend
 * plus its gaps/padding — so the computed fill height doesn't push the
 * legend off the bottom of the screen. */
const FULLSCREEN_CHROME_RESERVE = 140;

/** Fired after history.replaceState so useSyncExternalStore knows to re-read the URL
 * (replaceState doesn't dispatch popstate on its own). */
const FILTER_CHANGE_EVENT = "pseye:filterchange";

function subscribeToFilterUrl(callback: () => void) {
  window.addEventListener(FILTER_CHANGE_EVENT, callback);
  window.addEventListener("popstate", callback);
  return () => {
    window.removeEventListener(FILTER_CHANGE_EVENT, callback);
    window.removeEventListener("popstate", callback);
  };
}

function getFilterFromUrl(): MarketMapFilter {
  const param = new URLSearchParams(window.location.search).get("filter");
  return param && FILTER_KEYS.has(param as MarketMapFilter) ? (param as MarketMapFilter) : "all";
}

const EMPTY_SHARED_TICKERS: string[] = [];

// useSyncExternalStore compares snapshots by reference (Object.is) — parsing
// the URL fresh on every call would return a new array each time even when
// `?tickers=` hasn't changed, which React reads as "the store changed" on
// every check and loops forever ("The result of getSnapshot should be
// cached"). Cache against the raw param string, same pattern as
// lib/watchlist.ts's readTickers.
let cachedTickersParam: string | null = null;
let cachedSharedTickers: string[] = EMPTY_SHARED_TICKERS;

/** `?tickers=` is only meaningful alongside `?filter=watchlist` — it's how a
 * watchlist link shared by someone else carries their picks, since the
 * watchlist itself is anonymous localStorage with nothing on a server to
 * link to (see lib/watchlist.ts). Reuses the filter URL's change event/
 * subscription since both params live on the same URL. */
function getSharedTickersFromUrl(): string[] {
  const param = new URLSearchParams(window.location.search).get("tickers");
  if (param === cachedTickersParam) return cachedSharedTickers;
  cachedTickersParam = param;
  if (!param) {
    cachedSharedTickers = EMPTY_SHARED_TICKERS;
    return cachedSharedTickers;
  }
  const tickers = param
    .split(",")
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean);
  cachedSharedTickers = tickers.length > 0 ? tickers : EMPTY_SHARED_TICKERS;
  return cachedSharedTickers;
}

function clearSharedTickersInUrl() {
  const url = new URL(window.location.href);
  url.searchParams.delete("tickers");
  window.history.replaceState(null, "", url);
  window.dispatchEvent(new Event(FILTER_CHANGE_EVENT));
}

/** `?date=` — the time machine. Reuses the filter URL's change event/subscription since both params live on the same URL. */
function getDateFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get("date");
}

function selectDateInUrl(next: string | null) {
  const url = new URL(window.location.href);
  if (next) url.searchParams.set("date", next);
  else url.searchParams.delete("date");
  window.history.replaceState(null, "", url);
  window.dispatchEvent(new Event(FILTER_CHANGE_EVENT));
}

function formatPickerDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Syncs the active filter to the `?filter=` URL param — matches the useColorMode
 * pattern in TreemapChart.tsx (server snapshot "all" so hydration never mismatches
 * a client that might land on a deep-linked, non-default filter).
 */
export function MarketMap({ stocks, profileByTicker, snapshot, foreignFlow, sparklineByTicker }: MarketMapProps) {
  const filter = useSyncExternalStore(subscribeToFilterUrl, getFilterFromUrl, (): MarketMapFilter => "all");
  const sharedTickers = useSyncExternalStore(
    subscribeToFilterUrl,
    getSharedTickersFromUrl,
    (): string[] => EMPTY_SHARED_TICKERS
  );
  const { tickers: watchedTickers, toggle } = useWatchlist();
  const colorblind = useColorblindMode();
  const [addModalOpen, setAddModalOpen] = useState(false);
  const mapAreaRef = useRef<HTMLDivElement>(null);

  // The fullscreen target (see mapAreaRef below) is now just the canvas, not
  // the filter sidebar — so unlike its width (which TreemapChart already
  // measures itself via ResizeObserver), its height is otherwise a fixed
  // constant that would never grow to fill the screen. Tracked here so a
  // computed pixel height can be passed down only while fullscreen.
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [viewportHeight, setViewportHeight] = useState(0);

  useEffect(() => {
    function sync() {
      setIsFullscreen(document.fullscreenElement === mapAreaRef.current);
      setViewportHeight(window.innerHeight);
    }
    sync();
    document.addEventListener("fullscreenchange", sync);
    window.addEventListener("resize", sync);
    return () => {
      document.removeEventListener("fullscreenchange", sync);
      window.removeEventListener("resize", sync);
    };
  }, []);

  const fullscreenTreemapHeight = isFullscreen
    ? Math.max(400, viewportHeight - FULLSCREEN_CHROME_RESERVE)
    : undefined;

  // ---- Time machine: view the market as recorded on a past trade date ----
  const viewDate = useSyncExternalStore(subscribeToFilterUrl, getDateFromUrl, (): string | null => null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  // Both keyed by the date they belong to and *derived* against viewDate below
  // (rather than cleared in the effect) so no synchronous setState is needed
  // when the param changes or clears — a stale entry is simply ignored.
  const [pastView, setPastView] = useState<{ date: string; stocks: TreemapStock[] } | null>(null);
  const [failedDate, setFailedDate] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/market-map")
      .then((r) => (r.ok ? r.json() : { dates: [] }))
      .then((d: { dates?: string[] }) => {
        if (!cancelled) setAvailableDates(d.dates ?? []);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!viewDate) return;
    let cancelled = false;
    fetch(`/api/market-map?date=${viewDate}`)
      .then(async (r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json() as Promise<{ date: string; stocks: TreemapStock[] }>;
      })
      .then((d) => {
        if (!cancelled) setPastView({ date: d.date, stocks: d.stocks });
      })
      .catch(() => {
        if (!cancelled) setFailedDate(viewDate);
      });
    return () => {
      cancelled = true;
    };
  }, [viewDate]);

  const isPastView = viewDate !== null && pastView?.date === viewDate;
  const pastViewFailed = viewDate !== null && failedDate === viewDate && !isPastView;
  /** What the map/filters/movers actually render — today's server-fetched quotes, or the fetched past day's. */
  const baseStocks = isPastView ? pastView.stocks : stocks;

  // Viewing someone else's shared watchlist link, not the visitor's own —
  // takes priority over localStorage so opening a shared link never silently
  // shows (or worse, is confused with) the visitor's own picks.
  const isSharedWatchlistView = filter === "watchlist" && sharedTickers.length > 0;

  function selectFilter(next: MarketMapFilter) {
    const url = new URL(window.location.href);
    if (next === "all") url.searchParams.delete("filter");
    else url.searchParams.set("filter", next);
    url.searchParams.delete("tickers");
    window.history.replaceState(null, "", url);
    window.dispatchEvent(new Event(FILTER_CHANGE_EVENT));
  }

  function saveSharedWatchlist() {
    for (const ticker of sharedTickers) {
      if (!watchedTickers.includes(ticker)) toggle(ticker);
    }
    clearSharedTickersInUrl();
  }

  const filteredStocks = useMemo(() => {
    if (filter === "nasdaq100") return NASDAQ_100_STOCKS;
    if (filter === "watchlist") {
      const tickers = isSharedWatchlistView ? sharedTickers : watchedTickers;
      return baseStocks.filter((s) => tickers.includes(s.ticker));
    }
    return filterMarketMapStocks(baseStocks, filter);
  }, [baseStocks, filter, watchedTickers, isSharedWatchlistView, sharedTickers]);

  /** Stock count per filter, shown as a badge so the choice between e.g. "Top 50" and "Top 100" is informed rather than a guess. */
  const countByFilter = useMemo((): Record<MarketMapFilter, number> => {
    const counts = {} as Record<MarketMapFilter, number>;
    for (const { key } of MARKET_MAP_FILTERS) {
      if (key === "nasdaq100") counts[key] = NASDAQ_100_STOCKS.length;
      else if (key === "watchlist") counts[key] = baseStocks.filter((s) => watchedTickers.includes(s.ticker)).length;
      else counts[key] = filterMarketMapStocks(baseStocks, key).length;
    }
    return counts;
  }, [baseStocks, watchedTickers]);

  function getMarketMapShareUrl(): string {
    const url = new URL(window.location.href);
    if (filter === "watchlist" && !isSharedWatchlistView && watchedTickers.length > 0) {
      url.searchParams.set("filter", "watchlist");
      url.searchParams.set("tickers", watchedTickers.join(","));
    }
    return url.toString();
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {availableDates.length > 0 ? (
          <div className="flex items-center gap-2 text-xs font-medium text-panel-fg/60">
            <span className="kicker">Time machine</span>
            <CalendarDatePicker
              value={viewDate}
              availableDates={availableDates}
              onSelect={(iso) => selectDateInUrl(iso)}
              onClear={() => selectDateInUrl(null)}
              clearLabel="Today"
              triggerLabel={viewDate ? formatPickerDate(viewDate) : "Today"}
            />
          </div>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          <FullscreenButton targetRef={mapAreaRef} />
          <ShareButton getShareUrl={getMarketMapShareUrl} />
        </div>
      </div>

      {isPastView && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-panel px-4 py-2.5 text-sm shadow-sm shadow-black/5 ring-1 ring-panel-border">
          <span className="text-panel-fg/70">
            Viewing the market as recorded on <span className="font-medium text-panel-fg">{formatPickerDate(pastView.date)}</span>
          </span>
          <div className="flex items-center gap-2">
            <Link
              href={`/daily/${pastView.date}`}
              className="rounded-md bg-panel-active px-2.5 py-1 text-xs font-medium text-panel-fg transition-colors hover:brightness-110"
            >
              Day recap →
            </Link>
            <button
              type="button"
              onClick={() => selectDateInUrl(null)}
              className="rounded-md px-2.5 py-1 text-xs font-medium text-panel-fg/60 transition-colors hover:bg-panel-raised hover:text-panel-fg"
            >
              Back to today
            </button>
          </div>
        </div>
      )}

      {pastViewFailed && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-panel px-4 py-2.5 text-sm shadow-sm shadow-black/5 ring-1 ring-panel-border">
          <span className="text-panel-fg/70">No market data recorded for {viewDate} — showing today instead.</span>
          <button
            type="button"
            onClick={() => selectDateInUrl(null)}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-panel-fg/60 transition-colors hover:bg-panel-raised hover:text-panel-fg"
          >
            Clear
          </button>
        </div>
      )}
      <div className="flex flex-col gap-4 sm:flex-row">
        <nav
          className="flex shrink-0 flex-col gap-2 overflow-x-auto rounded-xl bg-panel p-2 shadow-sm shadow-black/5 ring-1 ring-panel-border sm:sticky sm:top-16 sm:w-48 sm:gap-0.5 sm:self-start sm:overflow-visible"
          aria-label="Market map filters"
        >
          <span className="kicker hidden border-b border-panel-border px-2 pb-2 text-panel-fg/55 sm:block">
            Filters
          </span>
          <div className="flex gap-2 sm:flex-col sm:gap-0.5">
            {MARKET_MAP_FILTERS.map((option) => {
              const isActive = option.key === filter;
              return (
                <button
                  key={option.key}
                  type="button"
                  onClick={() => selectFilter(option.key)}
                  aria-pressed={isActive}
                  className={`group relative flex items-center justify-between gap-3 whitespace-nowrap rounded-md px-3 py-2 text-left text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-panel-active text-panel-fg before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-up before:content-['']"
                      : "text-panel-fg/80 hover:bg-panel-raised hover:text-panel-fg"
                  }`}
                >
                  <span>{option.label}</span>
                  <span
                    className={`text-[11px] tabular-nums transition-colors ${
                      isActive ? "text-panel-fg/60" : "text-panel-fg/55 group-hover:text-panel-fg/70"
                    }`}
                  >
                    {countByFilter[option.key]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Matches finviz's own "Colorblind Mode" checkbox (same sidebar
              placement) — swaps the treemap's red/green scale for orange/blue
              (see packages/treemap-layout/color.ts's *_COLORBLIND_RANGE).
              Scoped to just the map's box colors, not a sitewide --up/--down
              override, same as finviz's own toggle. */}
          <label className="flex items-center gap-2 border-t border-panel-border px-2 pt-2 text-xs font-medium text-panel-fg/70">
            <input
              type="checkbox"
              checked={colorblind}
              onChange={(e) => setColorblindMode(e.target.checked)}
              className="h-3.5 w-3.5 accent-accent"
            />
            Colorblind mode
          </label>

          {/* The summary bar is today's PSEi/forex snapshot — hidden in a past-date
              view rather than shown next to a different day's map. */}
          {!isPastView && (
            <div className="border-t border-panel-border pt-2">
              <MarketSummaryBar snapshot={snapshot} foreignFlow={foreignFlow} />
            </div>
          )}

          <div className="border-t border-panel-border pt-2">
            <TopMovers quotes={baseStocks} />
          </div>
        </nav>

        {/* Fullscreen target for FullscreenButton above — deliberately just
            the canvas, not the filter sidebar, so fullscreen gives the map
            the whole screen instead of the sidebar's width back. bg-background
            covers the Fullscreen API's default black backdrop around the
            canvas; it's a no-op in normal flow since that's already the
            page's own background. The modal lives inside this subtree too —
            a sibling would be invisible while this element is fullscreened,
            since the Fullscreen API only paints the fullscreened element and
            its descendants. */}
        <div
          ref={mapAreaRef}
          className={`min-w-0 flex-1 bg-background ${isFullscreen ? "flex flex-col items-center justify-center gap-3 overflow-auto p-4" : ""}`}
        >
          {isSharedWatchlistView && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-panel px-4 py-2.5 text-sm shadow-sm shadow-black/5 ring-1 ring-panel-border">
              <span className="text-panel-fg/70">
                Viewing a shared watchlist — {sharedTickers.length} stock{sharedTickers.length === 1 ? "" : "s"}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={saveSharedWatchlist}
                  className="rounded-md bg-panel-active px-2.5 py-1 text-xs font-medium text-panel-fg transition-colors hover:brightness-110"
                >
                  Save to my watchlist
                </button>
                <button
                  type="button"
                  onClick={clearSharedTickersInUrl}
                  className="rounded-md px-2.5 py-1 text-xs font-medium text-panel-fg/60 transition-colors hover:bg-panel-raised hover:text-panel-fg"
                >
                  View my watchlist
                </button>
              </div>
            </div>
          )}

          {filter === "watchlist" && !isSharedWatchlistView && filteredStocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl bg-panel py-24 text-center shadow-sm shadow-black/5 ring-1 ring-panel-border">
              <button
                type="button"
                onClick={() => setAddModalOpen(true)}
                aria-label="Add a stock to your watchlist"
                className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-panel-border text-3xl font-light text-panel-fg/50 transition-colors hover:border-panel-fg/40 hover:text-panel-fg/80"
              >
                +
              </button>
              <div>
                <p className="text-sm font-medium text-panel-fg/70">Your watchlist is empty.</p>
                <p className="max-w-xs text-xs text-panel-fg/60">
                  Click the + to search and bookmark stocks, or star any stock from the map. Saved on this
                  device only.
                </p>
              </div>
            </div>
          ) : filter === "watchlist" && isSharedWatchlistView && filteredStocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl bg-panel py-24 text-center shadow-sm shadow-black/5 ring-1 ring-panel-border">
              <p className="text-sm font-medium text-panel-fg/70">
                This shared watchlist link didn&apos;t match any tracked stocks.
              </p>
            </div>
          ) : (
            <TreemapChart
              stocks={filteredStocks}
              profileByTicker={profileByTicker}
              // The sparkline is the *current* trailing month — misleading next to a past-date view, so it's withheld there.
              sparklineByTicker={isPastView ? undefined : sparklineByTicker}
              onAddTileClick={filter === "watchlist" && !isSharedWatchlistView ? () => setAddModalOpen(true) : undefined}
              // Only overridden in fullscreen — the treemap's height is otherwise a
              // fixed constant that wouldn't grow to use the extra screen space.
              height={fullscreenTreemapHeight}
            />
          )}

          {addModalOpen && <AddToWatchlistModal onClose={() => setAddModalOpen(false)} />}
        </div>
      </div>
    </div>
  );
}
