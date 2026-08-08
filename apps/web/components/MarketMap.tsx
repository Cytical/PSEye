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
import { MarketStatusBadge } from "./MarketStatusBadge";
import { CalendarDatePicker } from "@/components/CalendarDatePicker";
import { PSE_EDGE_COMPANIES } from "@pseye/source-quotes";
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
import { useScrollSnapSections, type SnapTarget } from "@/lib/useScrollSnapSections";
import type { CompanyProfile } from "@/lib/companyProfiles";
import type { MarketSnapshot } from "@/lib/marketSnapshot";
import type { LatestForeignFlow } from "@/lib/latestForeignFlow";
import type { MarketStatus } from "@/lib/marketStatus";

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
  /** Server's reading of market open/closed, for the headline badge — see MarketStatusBadge. */
  status: MarketStatus;
  /** Real DB-backed (with mock fallback) Nasdaq 100 roster, pre-fetched server-side — see lib/nasdaq100.ts's getNasdaq100Stocks. Falls back to the static NASDAQ_100_STOCKS mock if the caller doesn't pass one. */
  nasdaq100Stocks?: TreemapStock[];
}

const FILTER_KEYS = new Set(MARKET_MAP_FILTERS.map((f) => f.key));

/**
 * One titled block in the market map's sidebar. Titles are desktop-only: at
 * phone width the sidebar collapses to a horizontal strip below the map where
 * section headings would cost more room than they explain.
 */
function SidebarSection({
  title,
  className = "",
  children,
}: {
  title?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`py-2 ${className}`}>
      {/* Titles from sm up. Only a phone, where the sidebar collapses to a
          cramped strip, is short enough on room that a section heading costs
          more than it explains — the 640-1023px strip has the width for them. */}
      {title && <h2 className="kicker hidden px-3 pb-1.5 text-panel-fg/68 sm:block">{title}</h2>}
      {children}
    </section>
  );
}

/** Reserved pixels below the canvas in fullscreen — the "Day change" legend
 * and the fullscreen/share control bar, plus their gaps/padding — so the
 * computed fill height doesn't push either off the bottom of the screen.
 * (The control bar moved inside the fullscreen target so "Exit fullscreen"
 * stays reachable without the Esc key; that's the extra ~50px over the
 * legend-only reserve this used to be.) */
/** 228, up from 190: the legend became a padded panel with 28px chips sitting
 * a full 16px clear of the canvas, which is ~38px more than the strip it
 * replaced. */
const FULLSCREEN_CHROME_RESERVE = 228;

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
  status,
  nasdaq100Stocks = NASDAQ_100_STOCKS,
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

  // The page scrolls in three whole views rather than freely: the headline
  // (offset 0, implicit), the map framed on its own under the header, then the
  // FAQ. Only ever with the pointer off the treemap, which keeps wheel-to-zoom
  // for itself — see OWNS_WHEEL_ATTR.
  //
  // mapAreaRef is the canvas plus its "Day change" legend (see the div it's
  // attached to below). The FAQ is addressed by id because it's rendered by
  // app/page.tsx, a server component, which has no ref to hand down here.
  const snapTargets = useMemo((): SnapTarget[] => [mapAreaRef, "market-map-faq"], []);
  useScrollSnapSections(snapTargets);

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
    // the param on "All PSE" would bounce the visitor straight back to PSEi
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
    if (effectiveFilter === "nasdaq100") return nasdaq100Stocks;
    if (effectiveFilter === "watchlist") {
      const tickers = isSharedWatchlistView ? sharedTickers : watchedTickers;
      return baseStocks.filter((s) => tickers.includes(s.ticker));
    }
    return filterMarketMapStocks(baseStocks, effectiveFilter);
  }, [baseStocks, effectiveFilter, watchedTickers, isSharedWatchlistView, sharedTickers, nasdaq100Stocks]);

  /** Stock count per filter, shown as a badge so the choice between e.g. "Top 50" and "Top 100" is informed rather than a guess.
   * "All PSE" is the one exception: it shows the full tracked-company roster
   * size (PSE_EDGE_COMPANIES.length) rather than what the map actually
   * renders for it. The map itself still excludes the 9 SME Board names
   * (see baseStocks above), so the rendered box count is really 9 short of
   * this badge — deliberate, so the badge reads as "PSEye tracks this many
   * companies" rather than "this filter draws this many boxes," which the
   * other filters' badges do mean literally. */
  const countByFilter = useMemo((): Record<MarketMapFilter, number> => {
    const counts = {} as Record<MarketMapFilter, number>;
    for (const { key } of MARKET_MAP_FILTERS) {
      if (key === "all") counts[key] = PSE_EDGE_COMPANIES.length;
      else if (key === "nasdaq100") counts[key] = nasdaq100Stocks.length;
      else if (key === "watchlist") counts[key] = baseStocks.filter((s) => watchedTickers.includes(s.ticker)).length;
      else counts[key] = filterMarketMapStocks(baseStocks, key).length;
    }
    return counts;
  }, [baseStocks, watchedTickers, nasdaq100Stocks]);

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
      {/* Headline row: kicker/status badge/h1 on the left, Fullscreen/Share back
          at the top and pinned furthest-right on this same row — moved up from
          the strip below the canvas so they read as actions on the page, not
          something a visitor has to scroll past the whole map to find. */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="kicker text-accent">Market Map</p>
            {/* Seeded with the server's reading so SSR and the first client
                render agree, then kept honest in the browser — this route is
                cached for an hour, so a render-time value would go stale. */}
            <MarketStatusBadge initial={status} />
          </div>
          {/* nowrap only from sm up. Below that the vw term bottoms out at the
              clamp minimum, so the line stops scaling with the viewport and
              simply overflowed it: measured on a 390px phone, "Visualized."
              ended 42px past the right edge and gave the whole homepage a
              horizontal scrollbar. Wrapping to two lines breaks naturally after
              the comma, which also lets the minimum size go up from 1.35rem to
              1.75rem — the headline is bigger on phones now, not smaller. */}
          {/* Desktop ceiling was trimmed from 3.25rem to 2.5rem to stop the
              headline block eating 233px above the canvas, then nudged back to
              2.85rem: the map reclaimed that space elsewhere (the phantom
              header band at the top of the canvas, the chrome row that used to
              hold the legend), so the headline can carry a bit more weight
              again without pushing the bottom sector rows below the fold. */}
          {/* nowrap only from xl up. Below that the headline at its clamped
              size plus the Fullscreen/Share pair is wider than the row, so
              keeping it on one line pushed those two buttons down onto a
              second line at the *left* margin — which is where they sat on
              every laptop and tablet. Letting the headline break after the
              comma instead keeps the actions where they belong. Below sm the
              vw term bottoms out at the clamp minimum, so the line stops
              scaling with the viewport and simply overflowed it: measured on a
              390px phone, "Visualized." ended 42px past the right edge and gave
              the whole homepage a horizontal scrollbar. */}
          <h1 className="mt-1.5 font-serif text-[clamp(1.9rem,4.9vw,2.85rem)] font-semibold leading-[1.05] tracking-tight xl:whitespace-nowrap">
            The Philippine Stock Market, <span className="italic text-accent">Visualized.</span>
          </h1>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2 pt-3">
          <FullscreenButton targetRef={mapAreaRef} />
          <ShareButton getShareUrl={getMarketMapShareUrl} />
        </div>
      </div>

      {/* Phone-only "today at a glance" card. Above the map deliberately: it's
          the readable-on-a-phone content, and the map below it is the thing
          worth scrolling to. Desktop gets the same numbers from the sidebar. */}
      {!isPastView && (
        <MobileMarketSummary
          snapshot={snapshot}
          foreignFlow={foreignFlow}
          quotes={baseStocks}
          recapHref={`/daily/${latestRecapDate}`}
          status={status}
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
          <span className="text-panel-fg/70">No market data recorded for {viewDate}. Showing today instead.</span>
          <button
            type="button"
            onClick={() => selectDateInUrl(null)}
            className="rounded-md px-2.5 py-1 text-xs font-medium text-panel-fg/72 transition-colors hover:bg-panel-raised hover:text-panel-fg"
          >
            Clear
          </button>
        </div>
      )}
      {/* lg, not sm. The sidebar is a fixed 208px, so at 640-1023px it was
          taking a third of the page and leaving the treemap 497-753px to draw
          280 boxes in: measured at 900px, the canvas was 629px wide and hit its
          520px minimum height, i.e. the map was being squeezed into the worst
          shape it can take by a column of controls. Below lg the sidebar
          becomes a full-width strip under the map instead (its own contents
          already lay out horizontally there) and the canvas gets the page. */}
      <div className="flex flex-col gap-4 lg:flex-row">
        {/* `overflow-x-auto` is scoped to the filter chips rather than the whole
            nav: the date picker below opens an absolutely-positioned 260px
            popover, which a scroll container on the <nav> would clip on mobile
            (the desktop nav already opted out via sm:overflow-visible, so this
            only ever showed up at phone width). */}
        {/* Sidebar order is deliberate, top to bottom: the market's headline
            number, then what the map is showing, then what moved, then the
            controls that change how you're looking at it. It used to lead with
            the time machine (a control almost nobody opens) and bury the PSEi
            level below the filter list and a stray checkbox, so the first thing
            in the column was the least-used thing in it. Each block is a
            titled section now rather than a run of dividers. */}
        <nav
          // lg:mt-6 drops the column below the canvas's top edge rather than
          // starting flush with it. Flush, the sidebar's own "PSEI" kicker sat
          // on exactly the same line as the map's first sector header and the
          // two read as one banded row spanning the page; the offset separates
          // the controls from the thing they control.
          //
          // Sticky *and* independently scrollable: at 208px wide the column
          // runs past the fold on a laptop, and a sticky element taller than
          // the viewport simply pins its top and leaves the rest permanently
          // out of reach — the date picker and colorblind toggle at the bottom
          // were unreachable on a 900px-tall screen. Capping the height and
          // letting it scroll on its own restores them without giving up the
          // stickiness that keeps the filters beside the map.
          //
          // Deliberately no `overscroll-contain`: the map swallows every wheel
          // event over it, so the sidebar is one of the few places left to
          // scroll the page from, and containing overscroll here meant a wheel
          // over the sidebar moved nothing at all once it had no scroll of its
          // own to give. The page's snapper knows to leave an event alone while
          // this box can still absorb it (scrollsAnInnerBox in
          // lib/useScrollSnapSections.ts), so the handoff is clean either way.
          className="order-2 flex shrink-0 flex-col rounded-xl bg-panel p-2 shadow-sm shadow-black/5 ring-1 ring-panel-border lg:sticky lg:top-16 lg:order-none lg:mt-6 lg:max-h-[calc(100vh-5.5rem)] lg:w-52 lg:self-start lg:overflow-y-auto xl:w-56"
          aria-label="Market map controls"
        >
          {/* Today's PSEi snapshot — hidden in a past-date view rather than
              shown next to a different day's map, and on phones, where
              MobileMarketSummary carries the same numbers above the map. */}
          {!isPastView && (
            <div className="hidden lg:block">
              <MarketSummaryBar snapshot={snapshot} foreignFlow={foreignFlow} status={status} />
              {/* Same call to action MobileMarketSummary closes with, which
                  desktop had no equivalent of: the daily recap was only
                  reachable from the nav, so the numbers directly above this
                  had nowhere to lead. */}
              <Link
                href={`/daily/${latestRecapDate}`}
                className="mb-1 flex items-center justify-center gap-1.5 rounded-md bg-panel-active px-3 py-2 text-xs font-medium text-panel-fg transition-colors hover:brightness-110"
              >
                Full daily recap
                <span aria-hidden>→</span>
              </Link>
            </div>
          )}

          <SidebarSection title="Showing" className={isPastView ? undefined : "lg:border-t lg:border-panel-border"}>
            <div className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-0.5 lg:overflow-visible">
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
                    {/* Pill rather than bare digits: at 11px against a 14px
                        label the counts read as part of the label text, and
                        "Top 50 50" is a confusing thing to read. */}
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold tabular-nums transition-colors ${
                        isActive
                          ? "bg-panel text-panel-fg/80"
                          : "bg-panel-raised text-panel-fg/65 group-hover:text-panel-fg/80"
                      }`}
                    >
                      {countByFilter[option.key]}
                    </span>
                  </button>
                );
              })}
            </div>
            {/* Screen readers otherwise get no feedback at all from a filter
                press: the map's own contents change, but nothing announces
                that, and the pressed state alone doesn't say what happened. */}
            <p aria-live="polite" className="sr-only">
              {`Showing ${filteredStocks.length} stock${filteredStocks.length === 1 ? "" : "s"} on the market map`}
            </p>
          </SidebarSection>

          {/* No section title: TopMovers already labels its own two lists, and
              a "Movers" heading above "Top gainers" is a heading that says
              nothing the next line doesn't. */}
          <SidebarSection className="border-t border-panel-border">
            <TopMovers quotes={baseStocks} />
          </SidebarSection>

          {/* px-3 to line these two up with the section's own heading and with
              every filter row above them. The date picker used to sit at the
              panel's raw padding edge, 4px left of everything else in the
              column and rendered as a small inline pill on a background the
              same colour as its own, so it read as something dropped into the
              sidebar rather than part of it. Full width, raised fill. */}
          <SidebarSection title="View" className="border-t border-panel-border">
            <div className="flex flex-col gap-1.5">
              {availableDates.length > 0 && (
                <CalendarDatePicker
                  // Left-anchored, i.e. the default. It used to open leftward
                  // to stay inside the sidebar, back when the popover was an
                  // ordinary absolutely-positioned child that the sidebar
                  // could clip. It's a portaled, viewport-positioned popup
                  // now, so it can hang over the map like any other menu, and
                  // opening from the trigger's own left edge reads as attached
                  // to the control rather than pinned to the window edge.
                  className="block w-full"
                  // px-3 rather than the trigger's default px-2.5, so its label
                  // starts on the same 20px line as the section heading above
                  // it and every filter row in the column.
                  triggerClassName="w-full px-3 bg-panel-raised text-xs hover:bg-panel-active"
                  value={viewDate}
                  availableDates={availableDates}
                  onSelect={(iso) => selectDateInUrl(iso)}
                  onClear={() => selectDateInUrl(null)}
                  clearLabel="Today"
                  triggerLabel={viewDate ? formatPickerDate(viewDate) : "Today"}
                />
              )}
              {/* Matches finviz's own "Colorblind Mode" checkbox (same sidebar
                  placement) — swaps the treemap's red/green scale for orange/blue
                  (see packages/treemap-layout/color.ts's *_COLORBLIND_RANGE).
                  Scoped to just the map's box colors, not a sitewide --up/--down
                  override, same as finviz's own toggle. */}
              <label className="flex cursor-pointer items-center gap-2 rounded-md px-3 py-1 text-xs font-medium text-panel-fg/75 transition-colors hover:text-panel-fg">
                <input
                  type="checkbox"
                  checked={colorblind}
                  onChange={(e) => setColorblindMode(e.target.checked)}
                  className="h-3.5 w-3.5 accent-accent"
                />
                Colorblind mode
              </label>
            </div>
          </SidebarSection>
        </nav>

        {/* Fullscreen target for FullscreenButton above — deliberately just
            the canvas, not the filter sidebar, so fullscreen gives the map
            the whole screen instead of the sidebar's width back. bg-background
            covers the Fullscreen API's default black backdrop around the
            canvas; it's a no-op in normal flow since that's already the
            page's own background. The modal lives inside this subtree too —
            a sibling would be invisible while this element is fullscreened,
            since the Fullscreen API only paints the fullscreened element and
            its descendants.

            Also the screenshot target for etl/jobs/post-daily-tweet.ts's daily
            X post (id="market-map-canvas") — deliberately just this div, not
            the nav sidebar to its left (time machine/filter chips/colorblind
            toggle/PSEi summary bar/top movers) and not the headline above,
            so the posted image is the treemap alone. Don't remove/rename this
            id without updating CAPTURE_SELECTOR there. */}
        <div
          ref={mapAreaRef}
          id="market-map-canvas"
          className={`order-1 min-w-0 flex-1 bg-background lg:order-none ${isFullscreen ? "flex flex-col items-center justify-center gap-3 overflow-auto p-4" : ""}`}
        >
          {isSharedWatchlistView && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl bg-panel px-4 py-2.5 text-sm shadow-sm shadow-black/5 ring-1 ring-panel-border">
              <span className="text-panel-fg/70">
                Viewing a shared watchlist: {sharedTickers.length} stock{sharedTickers.length === 1 ? "" : "s"}
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

          {/* Exit-fullscreen affordance duplicated inside the fullscreen target
              itself — the top-of-page Fullscreen button above is otherwise
              unreachable once fullscreen is active, since the Fullscreen API
              only paints the fullscreened element's own subtree, and Esc
              shouldn't be the only way out. */}
          {isFullscreen && (
            <div className="flex items-center justify-end gap-2">
              <FullscreenButton targetRef={mapAreaRef} />
            </div>
          )}

          {addModalOpen && <AddToWatchlistModal onClose={() => setAddModalOpen(false)} />}
        </div>
      </div>
    </div>
  );
}
