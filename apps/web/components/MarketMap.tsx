"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { TreemapChart, type TreemapStock } from "./TreemapChart";
import { MarketSummaryBar } from "./MarketSummaryBar";
import { MobileMarketSummary } from "./MobileMarketSummary";
import { TopMovers } from "./TopMovers";
import { AddToWatchlistModal } from "./AddToWatchlistModal";
import { ShareButton } from "./ShareButton";
import { FullscreenButton } from "./FullscreenButton";
import { CalendarDatePicker } from "@/components/CalendarDatePicker";
import {
  MARKET_MAP_FILTERS,
  NARROW_DEFAULT_FILTER,
  filterMarketMapStocks,
  type MarketMapFilter,
} from "@/lib/marketMapFilters";
import { NASDAQ_100_STOCKS } from "@/lib/nasdaq100";
import { useWatchlist } from "@/lib/watchlist";
import { useColorblindMode, setColorblindMode } from "@/lib/colorblindMode";
import { useNarrowViewport } from "@/lib/useNarrowViewport";
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
  /** Most recent session that has a `/daily/[date]` recap, for MobileMarketSummary's link out. */
  latestRecapDate: string;
}

const FILTER_KEYS = new Set(MARKET_MAP_FILTERS.map((f) => f.key));

/** Reserved pixels below the canvas in fullscreen — the "Day change" legend
 * and the fullscreen/share control bar, plus their gaps/padding — so the
 * computed fill height doesn't push either off the bottom of the screen.
 * (The control bar moved inside the fullscreen target so "Exit fullscreen"
 * stays reachable without the Esc key; that's the extra ~50px over the
 * legend-only reserve this used to be.) */
const FULLSCREEN_CHROME_RESERVE = 190;

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

/** Whether the URL names a filter at all. "No param" and "?filter=all" are the
 * same map on desktop but not on mobile, where the absent case falls back to
 * NARROW_DEFAULT_FILTER — so the two have to be distinguishable. */
function hasFilterParamInUrl(): boolean {
  const param = new URLSearchParams(window.location.search).get("filter");
  return param !== null && FILTER_KEYS.has(param as MarketMapFilter);
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
export function MarketMap({
  stocks,
  profileByTicker,
  snapshot,
  foreignFlow,
  sparklineByTicker,
  latestRecapDate,
}: MarketMapProps) {
  const filter = useSyncExternalStore(subscribeToFilterUrl, getFilterFromUrl, (): MarketMapFilter => "all");
  const filterIsExplicit = useSyncExternalStore(subscribeToFilterUrl, hasFilterParamInUrl, (): boolean => false);
  const isNarrow = useNarrowViewport();
  /** What the map actually renders. Identical to `filter` everywhere except a
   * phone with no `?filter=` in the URL, which gets NARROW_DEFAULT_FILTER — see
   * lib/marketMapFilters.ts for why. Everything downstream (the sidebar's
   * active state, the share URL, the treemap itself) reads this, never
   * `filter`, so the UI can't claim to be showing one thing while showing
   * another. */
  const effectiveFilter: MarketMapFilter = !filterIsExplicit && isNarrow ? NARROW_DEFAULT_FILTER : filter;
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
  /** What the map/filters/movers actually render — today's server-fetched quotes, or the fetched
   * past day's. SME Board excluded for now (removed from sector browsing generally — see
   * sectorSlug.ts's VISIBLE_SECTORS) — filtered here rather than at the two upstream sources
   * (app/page.tsx's SSR quotes, /api/market-map's time-machine fetch) so both paths stay
   * consistent from one place instead of needing the same exclusion applied twice. */
  const baseStocks = (isPastView ? pastView.stocks : stocks).filter((s) => s.sector !== "SME Board");

  // Viewing someone else's shared watchlist link, not the visitor's own —
  // takes priority over localStorage so opening a shared link never silently
  // shows (or worse, is confused with) the visitor's own picks.
  const isSharedWatchlistView = effectiveFilter === "watchlist" && sharedTickers.length > 0;

  function selectFilter(next: MarketMapFilter) {
    const url = new URL(window.location.href);
    // On a phone an absent `?filter=` means NARROW_DEFAULT_FILTER, so deleting
    // the param on "All PSE" would bounce the visitor straight back to Top 30
    // instead of showing them everything. Write it explicitly there.
    if (next === "all" && !isNarrow) url.searchParams.delete("filter");
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
    if (effectiveFilter === "nasdaq100") return NASDAQ_100_STOCKS;
    if (effectiveFilter === "watchlist") {
      const tickers = isSharedWatchlistView ? sharedTickers : watchedTickers;
      return baseStocks.filter((s) => tickers.includes(s.ticker));
    }
    return filterMarketMapStocks(baseStocks, effectiveFilter);
  }, [baseStocks, effectiveFilter, watchedTickers, isSharedWatchlistView, sharedTickers]);

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
    // A phone can be showing NARROW_DEFAULT_FILTER without the URL saying so —
    // pin it, or the desktop recipient of a shared link opens a different map
    // than the one that was shared.
    if (effectiveFilter !== filter) url.searchParams.set("filter", effectiveFilter);
    if (effectiveFilter === "watchlist" && !isSharedWatchlistView && watchedTickers.length > 0) {
      url.searchParams.set("filter", "watchlist");
      url.searchParams.set("tickers", watchedTickers.join(","));
    }
    return url.toString();
  }

  // There is no toolbar row above the map anymore. The date picker moved into
  // the filter sidebar (a data-scope control, same as the filters themselves —
  // and the sidebar is sticky, so it costs no vertical space on desktop), and
  // Fullscreen/Share moved to a strip *under* the canvas. Between them that
  // reclaimed the empty band that used to sit between the headline and the
  // first tile on every desktop load.
  return (
    <div className="flex flex-col gap-4">
      {/* Phone-only "today at a glance" card. Above the map deliberately: it's
          the readable-on-a-phone content, and the map below it is the thing
          worth scrolling to. Desktop gets the same numbers from the sidebar. */}
      {!isPastView && (
        <MobileMarketSummary
          snapshot={snapshot}
          foreignFlow={foreignFlow}
          quotes={baseStocks}
          recapHref={`/daily/${latestRecapDate}`}
        />
      )}

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
              className="rounded-md px-2.5 py-1 text-xs font-medium text-panel-fg/72 transition-colors hover:bg-panel-raised hover:text-panel-fg"
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
            className="rounded-md px-2.5 py-1 text-xs font-medium text-panel-fg/72 transition-colors hover:bg-panel-raised hover:text-panel-fg"
          >
            Clear
          </button>
        </div>
      )}
      <div className="flex flex-col gap-4 sm:flex-row">
        {/* `overflow-x-auto` is scoped to the filter chips rather than the whole
            nav: the date picker below opens an absolutely-positioned 260px
            popover, which a scroll container on the <nav> would clip on mobile
            (the desktop nav already opted out via sm:overflow-visible, so this
            only ever showed up at phone width). */}
        <nav
          className="order-2 flex shrink-0 flex-col gap-2 rounded-xl bg-panel p-2 shadow-sm shadow-black/5 ring-1 ring-panel-border sm:order-none sm:sticky sm:top-16 sm:w-48 sm:gap-0.5 sm:self-start"
          aria-label="Market map filters"
        >
          {availableDates.length > 0 && (
            <div className="border-b border-panel-border px-2 pb-2">
              <span className="kicker text-panel-fg/68">Time machine</span>
              <CalendarDatePicker
                className="mt-1.5"
                value={viewDate}
                availableDates={availableDates}
                onSelect={(iso) => selectDateInUrl(iso)}
                onClear={() => selectDateInUrl(null)}
                clearLabel="Today"
                triggerLabel={viewDate ? formatPickerDate(viewDate) : "Today"}
              />
            </div>
          )}

          <span className="kicker hidden border-b border-panel-border px-2 pb-2 text-panel-fg/68 sm:block">
            Filters
          </span>
          <div className="flex gap-2 overflow-x-auto sm:flex-col sm:gap-0.5 sm:overflow-visible">
            {MARKET_MAP_FILTERS.map((option) => {
              const isActive = option.key === effectiveFilter;
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
                      isActive ? "text-panel-fg/72" : "text-panel-fg/68 group-hover:text-panel-fg/70"
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
            <div className="hidden border-t border-panel-border pt-2 sm:block">
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
          className={`order-1 min-w-0 flex-1 bg-background sm:order-none ${isFullscreen ? "flex flex-col items-center justify-center gap-3 overflow-auto p-4" : ""}`}
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
                  className="rounded-md px-2.5 py-1 text-xs font-medium text-panel-fg/72 transition-colors hover:bg-panel-raised hover:text-panel-fg"
                >
                  View my watchlist
                </button>
              </div>
            </div>
          )}

          {effectiveFilter === "watchlist" && !isSharedWatchlistView && filteredStocks.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 rounded-xl bg-panel py-24 text-center shadow-sm shadow-black/5 ring-1 ring-panel-border">
              <button
                type="button"
                onClick={() => setAddModalOpen(true)}
                aria-label="Add a stock to your watchlist"
                className="flex h-16 w-16 items-center justify-center rounded-lg border-2 border-dashed border-panel-border text-3xl font-light text-panel-fg/68 transition-colors hover:border-panel-fg/40 hover:text-panel-fg/80"
              >
                +
              </button>
              <div>
                <p className="text-sm font-medium text-panel-fg/70">Your watchlist is empty.</p>
                <p className="max-w-xs text-xs text-panel-fg/72">
                  Click the + to search and bookmark stocks, or star any stock from the map. Saved on this
                  device only.
                </p>
              </div>
            </div>
          ) : effectiveFilter === "watchlist" && isSharedWatchlistView && filteredStocks.length === 0 ? (
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
              onAddTileClick={
                effectiveFilter === "watchlist" && !isSharedWatchlistView ? () => setAddModalOpen(true) : undefined
              }
              // Only overridden in fullscreen — the treemap's height is otherwise a
              // fixed constant that wouldn't grow to use the extra screen space.
              height={fullscreenTreemapHeight}
            />
          )}

          {/* Map controls, below the canvas rather than above it — they're
              actions on the view, not context for reading it, so they don't
              earn a band between the headline and the first tile. Inside the
              fullscreen target (mapAreaRef) on purpose: "Exit fullscreen" is
              otherwise unreachable except via the Esc key, since the Fullscreen
              API only paints the fullscreened element's own subtree. */}
          <div className="mt-3 flex items-center justify-end gap-2">
            <FullscreenButton targetRef={mapAreaRef} />
            <ShareButton getShareUrl={getMarketMapShareUrl} />
          </div>

          {addModalOpen && <AddToWatchlistModal onClose={() => setAddModalOpen(false)} />}
        </div>
      </div>
    </div>
  );
}
