"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  computeTreemapLayout,
  pctChangeToColor,
  fitTileLabelAtZoom,
  bandFor,
  findAdjacentBox,
  legendStepsFor,
  DEFAULT_SCALE_RANGE,
  SECTOR_HEADER_HEIGHT,
  LEGEND_BANDS,
  type TreemapInput,
  type Direction,
} from "@pseye/treemap-layout";
import type { CompanyProfile } from "@/lib/companyProfiles";
import { useColorTheme } from "@/lib/useColorTheme";
import { useColorblindMode } from "@/lib/colorblindMode";
import { byInvestableCapDesc, investableMarketCap } from "@/lib/floatAdjustedCap";
import { sectorToSlug } from "@/lib/sectorSlug";
import { OWNS_WHEEL_ATTR } from "@/lib/useScrollSnapSections";
import { CompanyDetailPanel } from "./CompanyDetailPanel";

export interface TreemapStock extends TreemapInput {
  companyName: string;
  /** null when the source has no current trade to report — render as "N/A". */
  price: number | null;
  /** Defaults to PHP (PSE stocks). Nasdaq 100 mock data sets this to USD. */
  currency?: "PHP" | "USD";
  /** Today's traded ₱ turnover, when the source reports one — shown in the
   * hover tooltip. Same "not every source populates it" contract as
   * freeFloatPct: MockQuoteSource leaves it unset and the tooltip omits the row. */
  value?: number | null;
  /** One-line company description carried directly on the stock, for datasets
   * with no DB-backed profileByTicker entry (currently just Nasdaq 100 — see
   * lib/nasdaq100.ts). Only used as a fallback when profileByTicker has
   * nothing for this ticker; see the CompanyDetailPanel wiring below. */
  description?: string;
}

/** Copy for a stock the source had no trade to report for. Paired with
 * color.ts's NO_DATA_COLORS — change the two together. */
export const NO_TRADE_LABEL = "No trade";

/**
 * A null % change is "the source had no trade to report" (suspended ticker, no
 * fill this session), which is NOT the same as "traded and closed unchanged".
 * It used to render as a fabricated "+0.00%"; measured live 2026-08-06 that was
 * 144 of 280 tiles, i.e. the map was asserting that half the exchange closed
 * flat. See pctChangeToColor's NO_DATA_COLORS note.
 *
 * `compact` drops the "%" glyph, which finviz does on narrow tiles to reclaim
 * roughly 5px of width.
 */
export function formatPctChange(pctChange: number | null, compact = false): string {
  if (pctChange == null) return NO_TRADE_LABEL;
  // Round before choosing the sign, or a value that rounds to zero from below
  // prints "-0.00%" — which the cap-weighted sector headers hit routinely and
  // which reads as a rendering bug rather than as "flat".
  const rounded = Math.round(pctChange * 100) / 100;
  const safe = rounded === 0 ? 0 : rounded;
  return `${safe >= 0 ? "+" : ""}${safe.toFixed(2)}${compact ? "" : "%"}`;
}

interface TreemapChartProps {
  stocks: TreemapStock[];
  /** Fixed width in px. Omit to fill the available container width responsively. */
  width?: number;
  height?: number;
  /** Ticker -> one-time-fetched company description (see apps/web/lib/companyProfiles.ts). */
  profileByTicker?: Record<string, CompanyProfile>;
  /** Ticker -> real trailing-month closes (see apps/web/lib/sparklines.ts). The hover
   * tooltip's mini chart only renders from this — a ticker with no real history gets
   * no sparkline, never a synthetic one. */
  sparklineByTicker?: Record<string, number[]>;
  /** When set, an extra "+" tile is laid out into the grid itself (see ADD_TILE_TICKER below) that calls this on click — used by the "My Watchlist" filter so bookmarking stays on the map. */
  onAddTileClick?: () => void;
  /** Saturation window for the color scale, in percent (see color.ts's
   * DEFAULT_SCALE_RANGE / TIMEFRAME_RANGE). Widens for longer timeframes so a
   * 1-month map isn't a solid wall of saturated green. */
  scaleRange?: number;
}

/** Sentinel ticker/sector for the synthetic "+" tile injected into the layout
 * input (never present in `stocks`) — computeTreemapLayout treats it like any
 * other entry, weighted so it claims 1/(N+1) of the canvas (see the comment
 * on `layoutInput` below), which is what makes it resize itself down as more
 * stocks get bookmarked rather than sitting at a fixed pixel size. */
const ADD_TILE_TICKER = "__pseye_add_watchlist_tile__";
const ADD_TILE_SECTOR = "__pseye_add_watchlist_sector__";

/**
 * The canvas shape when the caller doesn't dictate a height.
 *
 * It was a flat 760px at every width, which on a wide desktop made the map
 * 2.4:1 — far wider than finviz's roughly 1.6:1, and the reason tiles came out
 * crushed vertically: a squarified treemap can only do so much inside a frame
 * that is itself nowhere near square. The floor and ceiling keep a narrow
 * phone from getting a letterbox and a 1600px desktop from getting a canvas
 * taller than the window.
 *
 * The same clamp is ALSO expressed in CSS on the canvas box (aspect-ratio plus
 * min/max-height, see the canvas below) rather than as a computed pixel height,
 * so the box is already the right size in the server HTML at whatever the
 * visitor's real width turns out to be. The JS value here only feeds the layout
 * solve and label fitting, both of which are proportional. Keep the two in sync.
 */
const MAP_ASPECT = 1.62;
const MIN_MAP_HEIGHT = 520;
const MAX_MAP_HEIGHT = 860;

function responsiveHeight(width: number): number {
  return Math.round(Math.min(MAX_MAP_HEIGHT, Math.max(MIN_MAP_HEIGHT, width / MAP_ASPECT)));
}

/**
 * Width the treemap is solved at during server rendering, before any real
 * measurement exists. Chosen as a middle-of-the-road desktop canvas width so
 * the squarified aspect ratios in the server-rendered HTML are close to what
 * most visitors actually get; percentage positioning handles the rest.
 */
const SSR_LAYOUT_WIDTH = 1200;

/** useLayoutEffect warns when it runs during SSR (it can't do anything useful
 * there). This is the standard opt-out: real layout effect in the browser,
 * inert effect on the server. */
const useIsomorphicLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;
// CSS custom properties, not JS constants, so the canvas chrome re-themes
// with the rest of the market map (see --panel-* in globals.css) — box fill
// colors below stay data-driven (pctChangeToColor) regardless of theme.
const CANVAS_BG = "var(--panel-canvas)";
const GRID_LINE = "var(--panel-grid)";

/** Applied to every sector header and stock tile's inline style so a filter
 * switch, a sort-order change, or a container resize glides boxes to their
 * new left/top/width/height instead of snapping — the map is read by
 * tracking where a specific stock's box went, and a hard cut breaks that.
 * Kept out of the hover/press transitions below (those stay fast and
 * separate) so glide speed and interaction feedback speed can differ.
 * `prefers-reduced-motion` still wins: the global `*` rule in globals.css
 * forces every transition-duration near-zero regardless of what's set here. */
const BOX_GLIDE_TRANSITION = "left 200ms cubic-bezier(0.22, 1, 0.36, 1), top 200ms cubic-bezier(0.22, 1, 0.36, 1), width 200ms cubic-bezier(0.22, 1, 0.36, 1), height 200ms cubic-bezier(0.22, 1, 0.36, 1)";
/** Stock tile only: the glide above, plus the fast hover/press feedback that
 * used to live in the Tailwind `transition-[filter,box-shadow]` utility —
 * moved to inline style because a single element can't carry two different
 * `transition-property`/`duration` declarations across a class + inline style
 * without the inline one clobbering the class's (inline `transition` is a
 * shorthand that wins over the individual longhands Tailwind emits). */
const TILE_TRANSITION = `${BOX_GLIDE_TRANSITION}, filter 100ms ease, box-shadow 100ms ease, transform 75ms ease-out, opacity 150ms ease`;

const MIN_ZOOM = 1;
/** Absolute floor for the zoom cap, regardless of layout — a board with no
 * tiny boxes at all (e.g. a handful of watchlist stocks) shouldn't cap zoom
 * below this just because the "smallest box" math has nothing small to find. */
const MAX_ZOOM_FLOOR = 4;
/**
 * Hard ceiling on the zoom cap, whatever the board.
 *
 * TARGET_MIN_TILE_PX over the All-PSE board's smallest sliver works out to 64x,
 * and the top of that range is unusable: the transform layer is then 85,000px
 * wide, and every frame asks the compositor to re-rasterize ~90 text labels at
 * a new scale. Measured on a 1600px viewport, a wheel gesture into that range
 * dropped a third of its frames. 10x still turns the smallest boxes from
 * one-pixel slivers into clickable targets, which is what the zoom is for;
 * reading a sub-pixel micro-cap's ticker is what /screener is for.
 */
const MAX_ZOOM_CEILING = 10;
/**
 * The on-screen size (px) the *smallest* box on the current board should
 * reach at max zoom — comfortably past fitTileLabel's MIN_LABEL_WIDTH/
 * MIN_LABEL_HEIGHT thresholds (28/16) so zooming all the way in doesn't just
 * enlarge a tiny box, it reveals its ticker too. A fixed MAX_ZOOM couldn't
 * do this for every board: ~282 All-PSE stocks include boxes a couple px
 * wide that need a much higher cap to become legible, while a small filter
 * (PSEi's 30) never has boxes that tiny and doesn't need one.
 */
const TARGET_MIN_TILE_PX = 64;
/**
 * How much a wheel tick changes zoom.
 *
 * Was 0.0015, which on a standard 120-unit wheel notch is a 20% jump per
 * notch: fifteen notches, an ordinary flick, took the map from 1x to 15x. That
 * is most of what "zooming is not smooth" was — not dropped frames but a
 * gesture with almost no resolution, where every notch overshot whatever the
 * visitor was aiming at. 0.0006 is a ~7.5% notch, so the same flick lands
 * around 3x and the zoom can actually be steered.
 */
const ZOOM_WHEEL_SENSITIVITY = 0.0006;
/**
 * How long after the last wheel/pinch event a continuous zoom gesture is
 * considered finished.
 *
 * While a gesture is running the transform layer's CSS transition is switched
 * off. It has to be: a wheel emits events far faster than 200ms, so every tick
 * was restarting a 200ms ease that never got to finish, and the map visibly
 * chased the cursor a fifth of a second behind the input. Zoom is applied
 * instantly during the gesture and the ease comes back for the discrete
 * changes it was written for (the +/- buttons, reset), which do want it.
 */
const ZOOM_GESTURE_IDLE_MS = 140;

/**
 * Undoes the transform layer's `scale(zoom)` for tile text, so a label is the
 * same number of screen pixels at 1x as it is at 10x.
 *
 * Text used to be magnified along with everything else, which is what a map
 * does to its *geography* but not to its labels: zooming in to read a small
 * company's ticker also blew the mega-caps' tickers up to poster size, and the
 * amount of text on screen never actually increased. Now zoom changes how much
 * of the board a tile occupies (and therefore whether it has room for a label
 * at all, see labelZoom) while type size stays put, which is how every real
 * mapping UI behaves.
 *
 * It is a CSS transform driven by a custom property rather than a computed
 * font-size for two reasons. A transform is a paint-time operation, so it costs
 * no layout on ~90 label elements per frame the way restyling font-size would;
 * and reading the live zoom from a variable set on the transform layer keeps
 * the tiles themselves out of the render, so the memo below still holds. The
 * whole label group is scaled as one element, not each line separately, or the
 * gap between the ticker and its percent line would keep scaling with the map.
 */
const LABEL_COUNTER_SCALE = "scale(calc(1 / var(--map-zoom, 1)))";

function clampZoom(z: number, maxZoom: number): number {
  return Math.min(maxZoom, Math.max(MIN_ZOOM, z));
}
/** Below this pointer movement (px), a mousedown+mouseup is treated as a click
 * on the stock tile underneath rather than a pan drag. */
const DRAG_THRESHOLD = 4;

/**
 * Diagonal hatch layered over a no-trade tile. The no-data fill alone is a
 * low-contrast neutral by design (it should recede), which makes it
 * indistinguishable from a flat close in greyscale, in print, and for a
 * visitor with low colour discrimination. The hatch carries the same meaning
 * without relying on hue at all.
 */
const NO_TRADE_HATCH =
  "repeating-linear-gradient(45deg, transparent 0 3px, rgba(127,127,127,0.28) 3px 4px)";

/**
 * Both fill palettes for one value, as the custom properties `.treemap-tile` in
 * globals.css switches between.
 *
 * Fill has to be resolved in CSS, not JS: these colors come off a 41-step data
 * scale so they can't be static theme variables, but the visitor's theme lives
 * in localStorage and does not exist during server rendering. Now that the map
 * ships in the server HTML instead of waiting for a client measurement, a
 * JS-resolved fill would hand every light-mode visitor a flash of the dark
 * palette. Emitting both and letting `[data-theme]` choose costs two short
 * declarations per tile and removes the flash entirely.
 *
 * Ink and its halo used to be emitted here too, as four more properties, until
 * label color stopped varying per tile — see TILE_INK in @pseye/treemap-layout.
 */
function tilePaintVars(pctChange: number | null, colorblind: boolean, range: number): React.CSSProperties {
  return {
    "--fd": pctChangeToColor(pctChange, "dark", colorblind, range),
    "--fl": pctChangeToColor(pctChange, "light", colorblind, range),
  } as React.CSSProperties;
}

/** Fired after history.replaceState so useSyncExternalStore knows to re-read the URL
 * (replaceState doesn't dispatch popstate on its own) — same pattern as MarketMap.tsx's
 * filter sync. Shared by both of this component's own URL params (`?ticker=` and
 * `?band=`) rather than one event each — same "this component's own view state changed"
 * bucket, same as MarketMap.tsx sharing one FILTER_CHANGE_EVENT across filter/tickers/date. */
const TICKER_CHANGE_EVENT = "pseye:tickerchange";

function subscribeToTickerUrl(callback: () => void) {
  window.addEventListener(TICKER_CHANGE_EVENT, callback);
  window.addEventListener("popstate", callback);
  return () => {
    window.removeEventListener(TICKER_CHANGE_EVENT, callback);
    window.removeEventListener("popstate", callback);
  };
}

function getTickerFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get("ticker");
}

function selectTickerInUrl(next: string | null) {
  const url = new URL(window.location.href);
  if (next) url.searchParams.set("ticker", next);
  else url.searchParams.delete("ticker");
  window.history.replaceState(null, "", url);
  window.dispatchEvent(new Event(TICKER_CHANGE_EVENT));
}

/** `?band=` — the interactive legend. A visitor can highlight one legend
 * swatch to dim every tile that doesn't belong to it, and the choice is
 * shareable/refreshable the same way the selected ticker is. */
function getBandFromUrl(): number | null {
  const param = new URLSearchParams(window.location.search).get("band");
  if (param === null) return null;
  const parsed = Number(param);
  // Validated against the default bands only: the param is read before the
  // active timeframe is known, and an out-of-range value simply clears itself.
  return LEGEND_BANDS.includes(parsed) ? parsed : null;
}

function selectBandInUrl(next: number | null) {
  const url = new URL(window.location.href);
  if (next !== null) url.searchParams.set("band", String(next));
  else url.searchParams.delete("band");
  window.history.replaceState(null, "", url);
  window.dispatchEvent(new Event(TICKER_CHANGE_EVENT));
}

/**
 * The canvas chrome (background, sector header bar, grid lines) follows the
 * active site theme via the --panel-* CSS vars for free. Box fill colors are
 * computed in JS (a continuous d3 interpolation, not a fixed swatch), so they
 * need `useColorTheme()` to pick the matching light/dark palette explicitly —
 * still a finviz-style poster of bright, saturated, data-driven colors, just
 * tuned per theme so the many tiles near 0% read as "flat neutral" against
 * *this* canvas rather than always the dark-mode near-black.
 */
export function TreemapChart({
  stocks,
  width: widthProp,
  height: heightProp,
  profileByTicker,
  sparklineByTicker,
  onAddTileClick,
  scaleRange = DEFAULT_SCALE_RANGE,
}: TreemapChartProps) {
  const colorTheme = useColorTheme();
  const colorblind = useColorblindMode();
  const [hovered, setHovered] = useState<TreemapStock | null>(null);
  // Synced to the `?ticker=` URL param (server snapshot null so hydration never mismatches
  // a client that might land on a deep-linked ticker) — makes "look at this stock" shareable.
  const selectedTicker = useSyncExternalStore(subscribeToTickerUrl, getTickerFromUrl, (): string | null => null);
  // Synced to `?band=` the same way — which legend swatch (if any) is currently isolating the map.
  const activeBand = useSyncExternalStore(subscribeToTickerUrl, getBandFromUrl, (): number | null => null);
  // Populated via each stock tile's ref callback below — lets the keyboard
  // handler move focus to a *specific* adjacent tile (found by
  // findAdjacentBox) rather than only being able to affect the currently
  // focused element the way native Tab order can.
  const tileRefs = useRef(new Map<string, HTMLButtonElement>());
  const containerRef = useRef<HTMLDivElement>(null);
  const [measuredWidth, setMeasuredWidth] = useState(widthProp ?? SSR_LAYOUT_WIDTH);
  /**
   * Whether measuredWidth is a real measurement yet, as opposed to
   * SSR_LAYOUT_WIDTH. Only label sizing consults this now — geometry does not,
   * because rects render as percentages (see `pctX`/`pctY` below).
   */
  const [hasMeasured, setHasMeasured] = useState(widthProp != null);

  /**
   * Measured before paint, not after.
   *
   * The tile layer used to be `hidden` until a regular useEffect + ResizeObserver
   * reported a width, which traded the homepage's whole first impression away to
   * avoid layout shift: measured live on 2026-08-06, the hero was an empty
   * bordered rectangle on every single load until hydration finished. Reversed
   * deliberately. Two changes make that safe:
   *
   * 1. Rects are positioned in percentages, so the server-rendered layout is
   *    already proportionally correct at any viewport width. Something real and
   *    on-brand paints immediately, even before JS runs.
   * 2. This measure runs in a layout effect, i.e. after DOM mutation but BEFORE
   *    the browser paints, so React has re-rendered at the true width by the
   *    first post-hydration paint. The visitor never sees the approximate pass
   *    resolve into the exact one.
   *
   * Only the SSR-vs-hydration correction can shift anything, and it is a
   * squarify re-solve within a box whose own footprint never changes.
   */
  useIsomorphicLayoutEffect(() => {
    if (widthProp != null) return;
    const el = containerRef.current;
    if (!el) return;
    const initial = Math.floor(el.getBoundingClientRect().width);
    // Set unconditionally, even when the measurement comes back 0. Chrome
    // collapses layout in a background tab, so a page loaded while hidden
    // measures zero here; guarding the flag on a truthy width left labels
    // suppressed until the ResizeObserver happened to fire. Width keeps its
    // SSR_LAYOUT_WIDTH fallback in that case and the observer corrects it.
    setHasMeasured(true);
    if (initial) setMeasuredWidth(initial);
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) {
        setMeasuredWidth(Math.floor(w));
        setHasMeasured(true);
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [widthProp]);

  const width = widthProp ?? measuredWidth;
  const height = heightProp ?? responsiveHeight(width);

  /**
   * Rects are positioned as a percentage of the canvas box rather than in
   * layout pixels. The two are mathematically identical once `width` is a real
   * measurement (the box is exactly `width` wide), but before that they are
   * not: percentages let the SSR layout, solved at SSR_LAYOUT_WIDTH, stretch to
   * whatever the real box turns out to be instead of overflowing or
   * under-filling it. That is what makes a server-rendered first paint viable.
   */
  const pctX = (value: number) => `${(value / width) * 100}%`;
  const pctY = (value: number) => `${(value / height) * 100}%`;

  // Giving the add-tile a weight equal to the *average* market cap of the
  // stocks already on screen makes it claim exactly 1/(N+1) of the total
  // canvas area regardless of how those N stocks' caps are distributed: if
  // their caps sum to S, the tile's share works out to (S/N) / (S + S/N) =
  // 1/(N+1) — half the screen at N=1, a third at N=2, and so on, which is
  // the "dynamic" sizing this was asked for rather than a fixed pixel size.
  const layoutInput = useMemo((): TreemapInput[] => {
    if (!onAddTileClick || stocks.length === 0) return stocks;
    const avgMarketCap = stocks.reduce((sum, s) => sum + s.marketCap, 0) / stocks.length;
    return [
      ...stocks,
      { ticker: ADD_TILE_TICKER, sector: ADD_TILE_SECTOR, marketCap: avgMarketCap, pctChange: null },
    ];
  }, [stocks, onAddTileClick]);

  // Recomputing the squarified treemap layout (a d3-hierarchy pass over ~100
  // boxes) on every hover — the component's most frequent re-render trigger —
  // was pure waste, since layout only actually depends on layoutInput/width/height.
  const layout = useMemo(() => computeTreemapLayout(layoutInput, width, height), [layoutInput, width, height]);
  // See TARGET_MIN_TILE_PX above — the add-tile is excluded since its size
  // tracks the average market cap on screen, not a real (possibly tiny) stock,
  // and would otherwise understate how far zoom actually needs to go.
  const maxZoom = useMemo(() => {
    const realBoxes = layout.stocks.filter((box) => box.ticker !== ADD_TILE_TICKER);
    if (realBoxes.length === 0) return MAX_ZOOM_FLOOR;
    const smallestDim = Math.min(...realBoxes.map((box) => Math.min(box.x1 - box.x0, box.y1 - box.y0)));
    return Math.min(MAX_ZOOM_CEILING, Math.max(MAX_ZOOM_FLOOR, TARGET_MIN_TILE_PX / smallestDim));
  }, [layout]);
  // Sector headers link out to /sectors/[slug] — but that route only knows
  // real PSE sectors (see lib/sectorSlug.ts), and this same component also
  // renders the Nasdaq 100 mock map (NASDAQ_100_STOCKS, currency "USD"),
  // whose sector strings are US GICS sectors. A blanket per-instance flag
  // rather than validating each sector name individually: some GICS names
  // (e.g. "Financials") coincidentally collide with a real PSE sector, which
  // would link a Nasdaq tile's header to an unrelated PSE sector page.
  const isPseMap = stocks[0]?.currency !== "USD";
  const byTicker = useMemo(() => new Map(stocks.map((s) => [s.ticker, s])), [stocks]);
  const selected = selectedTicker ? (byTicker.get(selectedTicker) ?? null) : null;

  const sparkline = hovered ? (sparklineByTicker?.[hovered.ticker] ?? null) : null;

  /**
   * 1-based market-cap rank among the stocks currently shown (respects the
   * active filter) — shown in the detail panel.
   *
   * Ordered by the same investableMarketCap size the boxes are drawn with
   * (see lib/floatAdjustedCap.ts) — market cap for almost every stock,
   * float-adjusted only for MFC/SLF — so the rank agrees with what the
   * visitor is looking at. Unadjusted, Manulife rendered as a sliver whose
   * own detail panel called it the largest company on the board.
   */
  const rankByTicker = useMemo(() => {
    const ranked = [...stocks].sort(byInvestableCapDesc);
    return new Map(ranked.map((s, i) => [s.ticker, i + 1]));
  }, [stocks]);

  /**
   * Cap-weighted average day change per sector, printed on the sector header.
   *
   * The header band used to carry only a name, spending 22px of a 760px canvas
   * on a label that said nothing about the market. Weighting by the same
   * investableMarketCap the boxes are sized with (rather than a plain mean
   * over constituents) keeps the number consistent with what the panel looks like:
   * a sector whose one mega-cap fell reads as down even if a dozen slivers
   * ticked up. Untraded names are skipped rather than counted as zero, for the
   * same reason they get their own fill.
   */
  const sectorPctChange = useMemo(() => {
    const totals = new Map<string, { weighted: number; weight: number }>();
    for (const stock of stocks) {
      if (stock.pctChange == null) continue;
      const weight = Math.max(investableMarketCap(stock), 1);
      const entry = totals.get(stock.sector) ?? { weighted: 0, weight: 0 };
      entry.weighted += stock.pctChange * weight;
      entry.weight += weight;
      totals.set(stock.sector, entry);
    }
    return new Map(
      [...totals].map(([sector, { weighted, weight }]) => [sector, weight > 0 ? weighted / weight : null] as const),
    );
  }, [stocks]);

  // ---- Zoom/pan: scroll-wheel zoom + drag-to-pan, applied as a CSS
  // transform to an inner layer so the canvas's own box (and the ResizeObserver
  // measuring it above) never changes size — only what's painted inside it does.
  // Smoothing is a plain CSS transition on `transform`, not a JS animation loop —
  // it runs on the compositor thread, so it stays smooth even when the page's
  // own requestAnimationFrame is throttled (e.g. an unfocused/backgrounded tab),
  // and it's far less code than hand-rolling an easing loop.
  //
  // zoom and pan are one state object, not two, so a zoom-to-cursor update can
  // compute the new pan from the *same* previous zoom/pan snapshot atomically —
  // splitting them risked one setState reading a pan that was about to be
  // reclamped for a zoom change the other setState hadn't applied yet. ----
  const canvasBoxRef = useRef<HTMLDivElement>(null);
  const [view, setView] = useState({ zoom: 1, pan: { x: 0, y: 0 } });
  const { zoom, pan } = view;
  // Disables the transition while actively dragging, so panning tracks the
  // pointer 1:1 instead of visibly lagging behind it.
  const [isPanning, setIsPanning] = useState(false);
  /** Same idea for a continuous zoom gesture — see ZOOM_GESTURE_IDLE_MS. */
  const [isZooming, setIsZooming] = useState(false);
  const zoomIdleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * Live zoom for the imperative wheel listener, which has to decide whether to
   * preventDefault synchronously, at event time.
   *
   * Advanced by zoomAtPoint the moment a zoom is applied, not just by the effect
   * below, because several wheel events can arrive between one setState and the
   * commit that follows it. Reading committed state there meant the limit checks
   * ran against a zoom several notches stale, so a gesture arriving at the
   * ceiling kept being treated as "still has room" and then, one commit later,
   * suddenly wasn't. The effect stays as the backstop for the paths that write
   * `view` directly (a reset, a filter change).
   */
  const zoomRef = useRef(zoom);
  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  /** Called on every wheel/pinch event; ends the gesture once they stop
   * arriving. Only flips state at the two edges of a gesture, not per event. */
  function markZoomGesture() {
    if (zoomIdleTimerRef.current) clearTimeout(zoomIdleTimerRef.current);
    else setIsZooming(true);
    zoomIdleTimerRef.current = setTimeout(() => {
      zoomIdleTimerRef.current = null;
      setIsZooming(false);
      // The one point in a gesture where the labels re-fit — see labelZoom.
      setLabelZoom(zoomRef.current);
    }, ZOOM_GESTURE_IDLE_MS);
  }
  // Tracks a pointer that's down and might turn into a drag; only promoted to
  // an actual captured drag once movement crosses DRAG_THRESHOLD (see
  // onCanvasPointerMove) — capturing immediately on pointerdown made every
  // click while zoomed retarget its `click` event to this layer instead of
  // the stock tile button underneath, since Chromium retargets `click` (not
  // just the pointer events) to whichever element holds pointer capture.
  const isDraggingRef = useRef(false);
  const didDragRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0, pointerId: 0 });
  /** Every pointer currently down on the canvas, by id. Two of them means a
   * pinch, which is the only zoom gesture a phone has that isn't the +/- pair
   * in the corner. */
  const activePointersRef = useRef(new Map<number, { x: number; y: number }>());
  /** Finger separation at the last pinch frame, so each move can be applied as
   * a ratio against the previous one rather than against the gesture's start. */
  const pinchDistanceRef = useRef<number | null>(null);

  /**
   * The zoom the tile labels are *fitted* at: the last settled zoom, not the
   * live one. Which tiles get a label, and at what size, is decided here.
   *
   * Note this is only the fit, not the rendered size. Labels hold one constant
   * on-screen size at every zoom level (see LABEL_COUNTER_SCALE), so nothing
   * about a label's appearance changes mid-gesture — the only thing settling
   * changes is *which* tiles have grown enough to be worth labelling and how
   * large a ladder step they can now carry.
   *
   * Pinning that to a value which holds still for the duration of a gesture is
   * what lets the memoized tile list below be reused frame after frame.
   * Re-fitting ~280 labels through fitTileLabel and reconciling 280 elements,
   * every frame, to produce almost exactly the previous frame's output was the
   * whole cost of a zoom.
   *
   * Written from the handful of places zoom actually settles (the end of a
   * wheel/pinch gesture, a +/- press, a reset) rather than derived in an effect
   * off `zoom`, which would be a setState-in-effect cascade.
   */
  const [labelZoom, setLabelZoom] = useState(1);

  /** Keeps the pan offset from pushing the zoomed content entirely out of the
   * canvas's own frame. Transform-origin is the layer's own top-left (see the
   * transform layer's style below), so at zoom `z` the content is `z` times
   * the canvas size extending down-and-right from that corner — pan can
   * range from 0 (content's top-left flush with the canvas's) to
   * -(size*(z-1)) (content's bottom-right flush with the canvas's), and no
   * further, or the far edge would show empty canvas instead of content. */
  function clampPan(next: { x: number; y: number }, z: number): { x: number; y: number } {
    const minX = -(width * (z - 1));
    const minY = -(height * (z - 1));
    return {
      x: Math.min(0, Math.max(minX, next.x)),
      y: Math.min(0, Math.max(minY, next.y)),
    };
  }

  /** Zooms by `factor`, keeping the content point currently under (cx, cy)
   * (canvas-relative coordinates) fixed on screen — the standard "zoom to
   * cursor" behavior (map apps, Figma, etc.) instead of always zooming toward
   * the canvas's center regardless of where the pointer is. */
  function zoomAtPoint(factor: number, cx: number, cy: number) {
    // Resolved and clamped out here rather than inside the updater so zoomRef
    // can be advanced synchronously — see the note on zoomRef.
    const nextZoom = clampZoom(zoomRef.current * factor, maxZoom);
    zoomRef.current = nextZoom;
    setView((prev) => {
      if (nextZoom === prev.zoom) return prev;
      const ratio = nextZoom / prev.zoom;
      const rawPan = {
        x: cx - (cx - prev.pan.x) * ratio,
        y: cy - (cy - prev.pan.y) * ratio,
      };
      return { zoom: nextZoom, pan: clampPan(rawPan, nextZoom) };
    });
  }

  // Reset zoom/pan when the underlying stock set changes (switching filters,
  // jumping to a past date) — a stale zoom pointed at boxes that just moved
  // or vanished would be more confusing than starting fresh. Done during
  // render (React's documented "adjusting state when a prop changes"
  // pattern), not in an effect, to avoid an extra render pass.
  const [prevStocksForReset, setPrevStocksForReset] = useState(stocks);
  if (stocks !== prevStocksForReset) {
    setPrevStocksForReset(stocks);
    setView({ zoom: 1, pan: { x: 0, y: 0 } });
    setLabelZoom(1);
  }

  // Wheel needs to call preventDefault (so scrolling over the map zooms it
  // instead of scrolling the page), which React's synthetic onWheel can't
  // reliably do — it's attached passively. A plain addEventListener with
  // {passive:false} is the standard workaround.
  //
  // Deps include width/height: clampPan's right/bottom bounds scale with
  // them, and the canvas starts at a placeholder width (1000) before
  // ResizeObserver reports the real measured width shortly after mount. With
  // an empty dep array this effect (and the onWheel closure it creates) ran
  // once at that placeholder width and never re-subscribed, so the clamp
  // kept using the stale, usually-too-small bound forever — zooming toward
  // the right/bottom edge got clamped early and never reached the true
  // corner, while the left/top bound (always 0) was unaffected. That's why
  // it only showed up on the right side.
  /** Wheel deltas arriving since the last animation frame, composed into one
   * factor. A trackpad or a fast wheel can emit several events between two
   * frames; applying each as its own setView meant several full React renders
   * per painted frame, all but the last of which the visitor never saw. */
  const wheelFactorRef = useRef(1);
  const wheelPointRef = useRef({ x: 0, y: 0 });
  const wheelFrameRef = useRef<number | null>(null);

  // Cancels anything still pending if the map unmounts mid-gesture.
  useEffect(
    () => () => {
      if (zoomIdleTimerRef.current) clearTimeout(zoomIdleTimerRef.current);
      if (wheelFrameRef.current != null) cancelAnimationFrame(wheelFrameRef.current);
    },
    [],
  );

  useEffect(() => {
    const el = canvasBoxRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      const factor = Math.exp(-e.deltaY * ZOOM_WHEEL_SENSITIVITY);
      // The map owns every wheel event that happens over it, full stop —
      // including the ones with nowhere left to zoom. This used to fall through
      // to the document at the ends of the range so a visitor could scroll past
      // the hero without moving the cursor off it, but the ends of the range
      // are exactly where a zoom gesture spends its last few notches, so in
      // practice what fell through was the tail of a deliberate zoom and the
      // page lurched underneath the map. Scrolling the page now means putting
      // the pointer outside the canvas, which on every layout here means the
      // margins, the sidebar, or anything above or below it. That is also
      // exactly where the page's scroll stops live, by the same rule read from
      // the other side: see OWNS_WHEEL_ATTR on this element.
      //
      // Two alternatives were tried and reverted: requiring Ctrl/Cmd, and
      // handing the wheel to the page whenever the map sat at 1x. Both existed
      // to let those stops work from over the map too, and both cost more than
      // they bought.
      e.preventDefault();
      markZoomGesture();
      // Nothing left to apply in this direction. Scheduling the frame below
      // would just cost a no-op render.
      const current = zoomRef.current;
      if ((factor < 1 && current <= MIN_ZOOM) || (factor > 1 && current >= maxZoom)) return;
      const rect = el!.getBoundingClientRect();
      wheelPointRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      wheelFactorRef.current *= factor;
      if (wheelFrameRef.current != null) return;
      wheelFrameRef.current = requestAnimationFrame(() => {
        wheelFrameRef.current = null;
        const pending = wheelFactorRef.current;
        wheelFactorRef.current = 1;
        zoomAtPoint(pending, wheelPointRef.current.x, wheelPointRef.current.y);
      });
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // The live zoom is read off zoomRef, not the closure, so this no longer
    // re-subscribes on every wheel tick — width/height/maxZoom still have to be
    // here because clampPan and clampZoom close over them and a stale bound
    // clamps the pan short of the true corner.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- zoomAtPoint and markZoomGesture are plain functions redefined each render, closing over stable setState/refs plus width/height/maxZoom, all listed.
  }, [width, height, maxZoom]);

  function zoomBy(factor: number) {
    // No cursor position for a button click — zoom toward the canvas center.
    zoomAtPoint(factor, width / 2, height / 2);
    // A discrete press is already a settled zoom, so labels re-fit with it.
    // zoomAtPoint has already advanced zoomRef to the clamped result.
    setLabelZoom(zoomRef.current);
  }

  function resetZoom() {
    zoomRef.current = 1;
    setView({ zoom: 1, pan: { x: 0, y: 0 } });
    setLabelZoom(1);
  }


  /** Midpoint of the two active pinch pointers, in canvas coordinates —
   * the point zoomAtPoint should hold still. */
  function pinchCenter(): { x: number; y: number; distance: number } | null {
    const [a, b] = [...activePointersRef.current.values()];
    if (!a || !b) return null;
    const rect = canvasBoxRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: (a.x + b.x) / 2 - rect.left,
      y: (a.y + b.y) / 2 - rect.top,
      distance: Math.hypot(a.x - b.x, a.y - b.y),
    };
  }

  function onCanvasPointerDown(e: React.PointerEvent) {
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (activePointersRef.current.size === 2) {
      // A second finger converts an in-progress drag into a pinch.
      isDraggingRef.current = false;
      setIsPanning(false);
      pinchDistanceRef.current = pinchCenter()?.distance ?? null;
      return;
    }
    if (zoom <= 1) return;
    isDraggingRef.current = true;
    didDragRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y, pointerId: e.pointerId };
    // Deliberately NOT calling setPointerCapture here — see the isDraggingRef
    // comment above. Capture is deferred to onCanvasPointerMove, once actual
    // dragging (not just a click) is confirmed.
  }

  function onCanvasPointerMove(e: React.PointerEvent) {
    if (activePointersRef.current.has(e.pointerId)) {
      activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    }

    if (pinchDistanceRef.current != null) {
      const pinch = pinchCenter();
      if (!pinch || pinch.distance === 0) return;
      // Ratio against the previous frame, not the gesture start, so the pinch
      // composes with the clamping zoomAtPoint applies rather than fighting it.
      zoomAtPoint(pinch.distance / pinchDistanceRef.current, pinch.x, pinch.y);
      pinchDistanceRef.current = pinch.distance;
      // Same reason as the wheel: a pinch is continuous, so the transform's
      // 200ms ease would sit between the fingers and the map the whole time.
      markZoomGesture();
      // Suppresses the tap-to-select that a pinch's pointerup would otherwise
      // land on whichever tile happened to be under a finger.
      didDragRef.current = true;
      return;
    }

    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (!didDragRef.current) {
      if (Math.abs(dx) <= DRAG_THRESHOLD && Math.abs(dy) <= DRAG_THRESHOLD) return;
      didDragRef.current = true;
      setIsPanning(true);
      e.currentTarget.setPointerCapture(dragStartRef.current.pointerId);
    }
    setPan(clampPan({ x: dragStartRef.current.panX + dx, y: dragStartRef.current.panY + dy }, zoom));
  }

  function onCanvasPointerUp(e: React.PointerEvent) {
    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size < 2) pinchDistanceRef.current = null;
    isDraggingRef.current = false;
    setIsPanning(false);
  }

  /** Applies a pan-only update (zoom unchanged) — used by drag, which never
   * changes zoom, so it doesn't need `zoomAtPoint`'s atomic zoom+pan update. */
  function setPan(nextPan: { x: number; y: number }) {
    setView((prev) => ({ ...prev, pan: nextPan }));
  }

  /** Stock tile onClick guard — a drag that ends on top of a tile shouldn't
   * also select it, since the pointerup after a pan is otherwise indistinguishable
   * from a click. */
  function selectTickerUnlessDragged(ticker: string) {
    if (didDragRef.current) return;
    selectTickerInUrl(ticker);
  }

  /**
   * Where to put the tooltip before the pointer has moved once: the middle of
   * the tile it describes, in canvas coordinates (so pan/zoom are applied, the
   * same transform the tile itself is drawn under). Without it the tooltip
   * would flash at the canvas origin on the first frame of every hover, and a
   * visitor arriving by Tab or arrow key, who has no pointer position at all,
   * would never get a sensible placement.
   */
  function tooltipAnchorFor(ticker: string): { x: number; y: number } {
    const box = layout.stocks.find((b) => b.ticker === ticker);
    if (!box) return { x: width / 2, y: height / 2 };
    return {
      x: pan.x + ((box.x0 + box.x1) / 2) * zoom,
      y: pan.y + box.y1 * zoom,
    };
  }

  const ARROW_KEY_DIRECTION: Record<string, Direction> = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
  };

  /**
   * Tab order visits tiles in whatever order d3's squarify layout emits them
   * (sector, then size descending) — not a spatial order, so it can't answer
   * "the tile above this one." Arrow keys move focus by actual on-screen
   * adjacency instead, via findAdjacentBox over the current layout's rects.
   * Native Tab/Shift+Tab (DOM order) and Enter/Space (native <button>
   * activation) are untouched — this only adds the four arrow keys.
   */
  function onTileKeyDown(e: React.KeyboardEvent, ticker: string) {
    const direction = ARROW_KEY_DIRECTION[e.key];
    if (!direction) return;
    const current = layout.stocks.find((b) => b.ticker === ticker);
    if (!current) return;
    e.preventDefault();
    const candidates = layout.stocks.filter((b) => b.ticker !== ticker && b.ticker !== ADD_TILE_TICKER);
    const next = findAdjacentBox(current, direction, candidates);
    if (next) tileRefs.current.get(next.ticker)?.focus();
  }

  /**
   * The tile layer, memoized.
   *
   * Zoom is the frequent update on this component, and it changes nothing
   * about any individual tile: rects are positioned in percentages, and label
   * sizing reads the quantized labelZoom rather than zoom itself. Without this
   * memo a wheel gesture still rebuilt all ~280 elements and re-ran
   * fitTileLabel on each of them, once per frame, to produce output identical
   * to the previous frame's. Measured on the 273-stock All-PSE board that was
   * the difference between a clean 60fps gesture and dropping a quarter of its
   * frames; the 30-stock PSEi board was always smooth, which is what pointed
   * at per-tile work rather than at the transform.
   *
   * Everything a tile actually depends on is in the dep list. The omitted ones
   * (pctX/pctY, onTileKeyDown) are plain functions redefined every render that
   * read nothing but refs and width/height/layout, all of which are listed, so
   * holding an older copy of them is safe.
   */
  const tileNodes = useMemo(
    () =>
      layout.stocks.map((box) => {
        const w = box.x1 - box.x0;
        const h = box.y1 - box.y0;

        if (box.ticker === ADD_TILE_TICKER) {
          const iconSize = Math.max(18, Math.min(44, Math.min(w, h) / 2.4));
          return (
            <button
              key={box.ticker}
              type="button"
              onClick={() => {
                if (!didDragRef.current) onAddTileClick?.();
              }}
              aria-label="Add a stock to your watchlist"
              title="Add a stock to your watchlist"
              className="absolute flex flex-col items-center justify-center gap-1 overflow-hidden rounded-sm border-2 border-dashed border-panel-border text-panel-fg/65 transition-colors hover:border-panel-fg/50 hover:bg-panel-raised hover:text-panel-fg/80"
              style={{
                left: pctX(box.x0),
                top: pctY(box.y0),
                width: pctX(w),
                height: pctY(h),
                transition: BOX_GLIDE_TRANSITION,
              }}
            >
              <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              {w > 70 && h > 46 && <span className="text-xs font-medium">Add stock</span>}
            </button>
          );
        }

        // Resting fill and ink come from these custom properties via CSS, so
        // they are correct in the server HTML before any JS runs.
        const paint = tilePaintVars(box.pctChange, colorblind, scaleRange);
        const noTrade = box.pctChange == null;
        // Dimmed, not hidden/removed, when a legend band is active and this
        // tile isn't in it — the map's shape (sector layout, box sizes)
        // stays intact as a reference, and the tile is still reachable by
        // click/keyboard, just visually de-emphasized.
        //
        // An untraded stock counts as flat here, i.e. it belongs to the 0%
        // swatch. It briefly had a swatch of its own, which put an "n/a" chip
        // on a strip whose whole job is to read as one continuous scale. The
        // tile still hatches (that distinction is real, and the caption under
        // the map states it) — it just isn't a filter category anymore.
        const isDimmedByBand =
          activeBand !== null && bandFor(box.pctChange ?? 0, scaleRange) !== activeBand;
        // Visibility is judged against the on-screen (zoomed) size and type
        // size against the resting one — see fitTileLabelAtZoom. Layout units
        // are real px here (the layout is solved at the measured width), so no
        // conversion is needed. The one exception is the SSR pass at
        // SSR_LAYOUT_WIDTH, where labels may be slightly mis-sized for a single
        // pre-hydration paint.
        //
        // labelZoom, not zoom: settled rather than live, so mid-gesture wheel
        // frames don't re-run this for every tile and the memo around this
        // whole map can be reused between settle points.
        const label = fitTileLabelAtZoom(w, h, labelZoom, box.ticker);
        const stock = byTicker.get(box.ticker);
        const isHovered = hovered?.ticker === box.ticker;
        // fitTileLabel is asked about the tile's *on-screen* size, so the
        // sizes it hands back are already in screen pixels and get used
        // verbatim below — the transform layer's own scale is undone by
        // LABEL_COUNTER_SCALE rather than divided out of the font size.
        // A flat 2px ring drawn in the same local coordinate space as w/h
        // (the whole layer, ring included, is what gets CSS-scaled by zoom)
        // used to be thicker than the box itself for the smallest slivers —
        // at min(w,h) under 8px the ring alone would cover more of the tile
        // than its own fill color. Scaling it down below that size keeps the
        // hover ring readable as a highlight instead of a solid block.
        const hoverRingWidth = Math.min(2, Math.min(w, h) / 4);
        // Tiles butt up against each other with only d3's 1px paddingInner
        // gap between them (computeTreemapLayout.ts), which round(true)
        // rounds top-down per split — a sector's row (horizontal) splits
        // are usually much shorter than its column (vertical) splits, so
        // that 1px gap is far more likely to round away to 0 on a
        // horizontal seam than a vertical one. The result: vertical
        // borders between side-by-side tiles read as a solid line while
        // horizontal borders between stacked tiles vanish, most visibly on
        // gray/neutral tiles with no fill-color contrast to fall back on.
        // Drawing an explicit inset border here (independent of that
        // geometric gap) makes both directions equally visible regardless
        // of how the layout rounded.
        const borderWidth = Math.min(1, Math.min(w, h) / 6);

        return (
          <button
            key={box.ticker}
            ref={(el) => {
              if (el) tileRefs.current.set(box.ticker, el);
              else tileRefs.current.delete(box.ticker);
            }}
            type="button"
            // Hover feedback has to move *away* from the page's own
            // background to register: brightening works on the dark map's
            // near-black tiles, but on the light map's pale washes it just
            // pushes them toward the paper canvas and drains the color out
            // of exactly the tile being pointed at. Light mode deepens
            // instead, and outlines with ink rather than the white ring
            // that was near-invisible on a pale tile.
            className={`treemap-tile absolute flex flex-col items-center justify-center overflow-hidden text-center hover:z-10 active:scale-[0.97] ${
              colorTheme === "light" ? "hover:brightness-90" : "hover:brightness-125"
            }`}
            style={{
              ...paint,
              left: pctX(box.x0),
              top: pctY(box.y0),
              width: pctX(w),
              height: pctY(h),
              // Hatch marks an untraded stock without depending on hue.
              backgroundImage: noTrade ? NO_TRADE_HATCH : undefined,
              opacity: isDimmedByBand ? 0.32 : 1,
              boxShadow: isHovered
                ? `inset 0 0 0 ${hoverRingWidth}px ${colorTheme === "light" ? "rgba(11,11,11,0.55)" : "rgba(255,255,255,0.85)"}`
                : `inset 0 0 0 ${borderWidth}px ${GRID_LINE}`,
              transition: TILE_TRANSITION,
            }}
            onMouseEnter={() => stock && setHovered(stock)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => stock && setHovered(stock)}
            onBlur={() => setHovered(null)}
            onClick={() => stock && selectTickerUnlessDragged(stock.ticker)}
            onKeyDown={(e) => onTileKeyDown(e, box.ticker)}
            title={
              noTrade
                ? `${box.ticker}: no trade today. Click for details`
                : `${box.ticker} ${formatPctChange(box.pctChange)}: click for details`
            }
            aria-label={
              noTrade
                ? `${box.ticker}${stock ? `, ${stock.companyName}` : ""}, no trade today`
                : `${box.ticker}${stock ? `, ${stock.companyName}` : ""}, ${formatPctChange(box.pctChange)} today`
            }
            // Only the tile the tooltip is currently describing points at it.
            // A static reference on all 280 would have every tile announce
            // some other stock's numbers.
            aria-describedby={isHovered && !selected ? TOOLTIP_ID : undefined}
          >
            {/* Geometry paints from the server HTML, labels wait for a real
                measurement. The SSR layout is solved at SSR_LAYOUT_WIDTH, so
                its font sizes would be wildly oversized on a phone; colors and
                shapes carry the first paint on their own and the text arrives
                pre-paint at hydration. Text appearing inside an
                already-correctly-positioned box is not a layout shift. */}
            {hasMeasured && label.tickerSize != null && (
              // One wrapper for both lines, counter-scaled as a unit — see
              // LABEL_COUNTER_SCALE. shrink-0/whitespace-nowrap because its
              // layout box is measured before the scale is applied, so on a
              // narrow tile it is legitimately wider than its parent and must
              // not be squeezed or wrapped on account of that.
              <span
                className="flex shrink-0 flex-col items-center whitespace-nowrap"
                style={{ transform: LABEL_COUNTER_SCALE }}
              >
                <span
                  className="treemap-tile-label font-bold leading-tight tracking-tight"
                  style={{ fontSize: label.tickerSize }}
                >
                  {box.ticker}
                </span>
                {label.changeSize != null && (
                  <span
                    className="treemap-tile-label leading-tight opacity-90"
                    style={{ fontSize: label.changeSize }}
                  >
                    {noTrade ? "n/a" : formatPctChange(box.pctChange, !label.showPercentGlyph)}
                  </span>
                )}
              </span>
            )}
          </button>
        );
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see the note above the memo.
    [
      layout,
      labelZoom,
      width,
      height,
      colorblind,
      scaleRange,
      colorTheme,
      hasMeasured,
      activeBand,
      hovered,
      selected,
      byTicker,
      onAddTileClick,
    ],
  );

  return (
    // gap-4, up from gap-2.5. At 10px the legend read as an accessory stuck to
    // the bottom edge of the canvas rather than a caption sitting under it;
    // pt-1 on top of that keeps the whole block from crowding whatever comes
    // above it on the page.
    <div ref={containerRef} className="flex w-full flex-col items-center gap-4 pt-1">
      {/* role="group", NOT role="img" — an img role tells assistive tech to
          treat the contents as one flat picture, which would hide every
          per-stock button inside from screen readers entirely. */}
      <div
        ref={canvasBoxRef}
        // w-full (not the measured pixel width) whenever the caller isn't
        // dictating a width: the box then has its final size in the server-
        // rendered HTML, so it never resizes once ResizeObserver reports.
        className={`relative select-none overflow-hidden rounded-xl shadow-sm shadow-black/10 ring-1 ring-panel-border ${
          widthProp == null ? "w-full" : ""
        }`}
        style={{
          width: widthProp,
          // Shape stated in CSS, not as the computed pixel height, whenever the
          // caller isn't dictating one — see MAP_ASPECT. This is what keeps the
          // server-rendered box the right size at the visitor's real width
          // instead of at SSR_LAYOUT_WIDTH's, so nothing resizes at hydration.
          ...(heightProp == null
            ? { aspectRatio: MAP_ASPECT, minHeight: MIN_MAP_HEIGHT, maxHeight: MAX_MAP_HEIGHT }
            : { height: heightProp }),
          background: CANVAS_BG,
        }}
        // This element owns the `wheel` listener below, and says so, so the
        // page's scroll snapper never takes a gesture aimed at the map: over
        // the canvas the wheel zooms, off it the wheel moves between the page's
        // stops. Keep the attribute on the same element as the listener.
        {...{ [OWNS_WHEEL_ATTR]: "" }}
        role="group"
        aria-label="PSE market map: box size is free-float market cap, color is today's percent change, hatched boxes did not trade. Scroll or pinch to zoom, drag to pan, arrow keys to move between stocks."
      >
        {/* Zoom/pan transform layer — scaling/translating this instead of the
            canvas box above keeps the box's own footprint (and the width
            ResizeObserver watches) fixed; only the painted content moves. */}
        <div
          className="absolute inset-0"
          style={{
            // The live zoom, published to CSS so tile labels can cancel it out
            // without any of them re-rendering (see LABEL_COUNTER_SCALE). It
            // rides along on the one element whose inline style already changes
            // every frame, so it costs nothing extra to keep current.
            ["--map-zoom" as string]: String(zoom),
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
            // No ease during a continuous gesture (see ZOOM_GESTURE_IDLE_MS);
            // the +/- buttons and reset still glide.
            transition: isPanning || isZooming ? "none" : "transform 200ms cubic-bezier(0.22, 1, 0.36, 1)",
            // Deliberately no `will-change: transform` here. It is the obvious
            // thing to reach for and it measured *worse* on this layer (17
            // dropped frames per gesture against 12 without it): promoting a
            // subtree of ~280 boxes and ~90 text labels means the compositor
            // holds and re-rasterizes one enormous texture, which is more work
            // than letting Chrome paint the visible part normally.
            cursor: zoom > 1 ? "grab" : undefined,
            // "pan-y" rather than unset at rest: it hands multi-touch to the
            // pinch handler above (the browser would otherwise claim it for
            // page zoom) while still letting a one-finger swipe scroll the
            // page past the map, which is the only way off a full-height hero
            // on a phone. Once zoomed in, one finger pans the map instead.
            touchAction: zoom > 1 ? "none" : "pan-y",
          }}
          onPointerDown={onCanvasPointerDown}
          onPointerMove={onCanvasPointerMove}
          onPointerUp={onCanvasPointerUp}
          onPointerCancel={onCanvasPointerUp}
        >
        {layout.sectors
          .filter((sector) => sector.sector !== ADD_TILE_SECTOR)
          .map((sector) => {
            // A transparent band, not a filled bar. finviz lets the map
            // background show through its sector headers, which is what stops
            // seven header strips from reading as structural chrome competing
            // with the data. Only the hover state paints a background now.
            const headerStyle = {
              left: pctX(sector.x0),
              top: pctY(sector.y0),
              width: pctX(sector.x1 - sector.x0),
              height: SECTOR_HEADER_HEIGHT,
              transition: BOX_GLIDE_TRANSITION,
            };
            const sectorChange = sectorPctChange.get(sector.sector) ?? null;
            const headerWidth = sector.x1 - sector.x0;

            const label = (
              <>
                <span className="truncate">{sector.sector}</span>
                {/* The name wins when the panel is narrow: a header reading
                    "MIN… +1.69%" is worse than one reading "MINING & OIL".
                    Budget is the name's own rough width plus room for the
                    number, rather than one flat pixel threshold. */}
                {sectorChange != null && headerWidth > sector.sector.length * 6.5 + 52 && (
                  <span
                    className={`shrink-0 tabular-nums ${sectorChange >= 0 ? "text-up" : "text-down"}`}
                    // The sector's own move, cap-weighted (see sectorPctChange).
                    // Suppressed on narrow panels so it never crowds out the name.
                  >
                    {formatPctChange(sectorChange)}
                  </span>
                )}
              </>
            );

            if (!isPseMap) {
              return (
                <div
                  key={sector.sector}
                  className="absolute flex items-center gap-1.5 overflow-hidden whitespace-nowrap px-2 text-[11px] font-semibold uppercase tracking-wide text-panel-fg/75"
                  style={headerStyle}
                >
                  {label}
                </div>
              );
            }

            return (
              <Link
                key={sector.sector}
                href={`/sectors/${sectorToSlug(sector.sector as Parameters<typeof sectorToSlug>[0])}`}
                // Sits inside the same pan/drag layer as the stock tiles (see
                // onPointerDown above) — without stopping propagation here, a
                // zoomed-in drag that starts on a header would still fire this
                // link's navigation on pointerup instead of being treated as a
                // pan, since headers never opted into the drag-threshold logic
                // tiles get via selectTickerUnlessDragged.
                onPointerDown={(e) => e.stopPropagation()}
                className="absolute flex items-center gap-1.5 overflow-hidden whitespace-nowrap rounded-sm px-2 text-[11px] font-semibold uppercase tracking-wide text-panel-fg/75 transition-colors hover:bg-panel-active hover:text-panel-fg"
                style={headerStyle}
                title={
                  sectorChange == null
                    ? `Browse the ${sector.sector} sector`
                    : `${sector.sector}, ${formatPctChange(sectorChange)} today. Browse the sector.`
                }
              >
                {label}
                <svg
                  aria-hidden="true"
                  width="9"
                  height="9"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0 opacity-50"
                >
                  <path d="M9 6l6 6-6 6" />
                </svg>
              </Link>
            );
          })}

        {tileNodes}
        </div>

        {/* Zoom cluster, floated over the canvas's top-right corner rather than
            sitting in a chrome row above it. It used to share a row with the
            legend, which cost a full row of vertical space to hold two 36px
            buttons; over the canvas it costs none, and it sits where the thing
            it controls actually is. Opposite corner from the "Reset zoom"
            button and the tooltip, both bottom-left. */}
        {/* map-zoom-controls is a hook for the daily X bot, which hides this
            cluster before it screenshots the canvas — a "− +" widget floating
            in a posted image reads as an artifact, not a control. See
            captureMarketMapScreenshot in etl/jobs/post-daily-tweet.ts. */}
        <div className="map-zoom-controls absolute top-3 right-3 flex items-center gap-2">
          {zoom > 1 && (
            <button
              type="button"
              onClick={resetZoom}
              className="rounded-lg bg-panel/90 px-2.5 py-1.5 text-[11px] font-medium text-panel-fg/70 shadow-sm shadow-black/10 ring-1 ring-panel-border backdrop-blur-sm transition-colors hover:bg-panel-raised hover:text-panel-fg"
            >
              Reset zoom
            </button>
          )}
          {/* Desktop only. On a 343px phone canvas this cluster sat on top of
              the second sector panel's header, hiding the name of a whole
              sector to offer a control that touch already has a better gesture
              for (see the pinch handler on the transform layer). "Reset zoom"
              above still appears once a pinch has zoomed in, so there is always
              a way back out. */}
          <div className="hidden items-center overflow-hidden rounded-lg shadow-sm shadow-black/10 ring-1 ring-panel-border sm:flex">
            <button
              type="button"
              onClick={() => zoomBy(1 / 1.4)}
              disabled={zoom <= MIN_ZOOM}
              aria-label="Zoom out"
              // 36px, up from 28: the old buttons were well under the 44px
              // touch-target guideline, and on a phone they share the job with
              // the pinch handler on the canvas rather than being the only way in.
              className="flex h-9 w-9 items-center justify-center bg-panel/90 text-base font-semibold text-panel-fg/70 backdrop-blur-sm transition-colors hover:bg-panel-raised hover:text-panel-fg disabled:opacity-40"
            >
              −
            </button>
            <button
              type="button"
              onClick={() => zoomBy(1.4)}
              disabled={zoom >= maxZoom}
              aria-label="Zoom in"
              className="flex h-9 w-9 items-center justify-center border-l border-panel-border bg-panel/90 text-base font-semibold text-panel-fg/70 backdrop-blur-sm transition-colors hover:bg-panel-raised hover:text-panel-fg disabled:opacity-40"
            >
              +
            </button>
          </div>
        </div>

        {hovered && !selected && (
          <TileTooltip
            canvasRef={canvasBoxRef}
            stock={hovered}
            sparkline={sparkline}
            anchor={tooltipAnchorFor(hovered.ticker)}
            canvasWidth={width}
            canvasHeight={height}
          />
        )}
      </div>

      {selected && (
        <CompanyDetailPanel
          stock={selected}
          profile={
            profileByTicker?.[selected.ticker] ??
            (selected.description ? { description: selected.description, source: "Company profile" } : null)
          }
          rank={rankByTicker.get(selected.ticker) ?? null}
          totalCount={stocks.length}
          onClose={() => selectTickerInUrl(null)}
        />
      )}

      {/* Legend row, centered under the map. It shared this row with a caption
          spelling out what box area means; that reads better as an FAQ answer
          (see app/page.tsx) than as permanent chrome, and pulling it out lets
          the scale sit centered on the map it belongs to instead of pushed to
          the left edge by a justify-between. */}
      <div className="flex w-full justify-center">
        <MapLegend
          steps={legendStepsFor(scaleRange)}
          activeBand={activeBand}
          colorblind={colorblind}
          onSelect={selectBandInUrl}
        />
      </div>
    </div>
  );
}

const TOOLTIP_ID = "treemap-hover-tooltip";
/** 280, up from 236: the trailing-month chart is the reason to look at this
 * card at all, and it now gets the card's full inner width instead of sharing
 * a line with a "1M" caption. */
const TOOLTIP_WIDTH = 280;
/** Roughly how tall the tooltip gets with a sparkline. Only used to decide
 * whether it still fits below the cursor; once it doesn't, the flipped
 * placement anchors the tooltip's own bottom edge and needs no estimate. */
const TOOLTIP_CLEARANCE = 250;
const TOOLTIP_GAP = 16;
const TOOLTIP_EDGE_PAD = 6;

/** Compact ₱/$ magnitude for market cap and turnover. */
function formatMagnitude(amount: number, currency: "PHP" | "USD" = "PHP"): string {
  const symbol = currency === "USD" ? "$" : "₱";
  if (amount >= 1e12) return `${symbol}${(amount / 1e12).toFixed(2)}T`;
  if (amount >= 1e9) return `${symbol}${(amount / 1e9).toFixed(1)}B`;
  if (amount >= 1e6) return `${symbol}${(amount / 1e6).toFixed(0)}M`;
  return `${symbol}${Math.round(amount).toLocaleString("en-US")}`;
}

function changeInk(pctChange: number | null): string {
  if (pctChange == null) return "text-panel-fg/60";
  return pctChange >= 0 ? "text-up" : "text-down";
}

/**
 * The hover card, positioned against the cursor rather than parked in the
 * canvas's bottom-left corner. On a 1100px-wide map the fixed corner could sit
 * most of a screen away from the tile it was describing, which meant reading it
 * cost a saccade across the whole map and back.
 *
 * It positions itself by writing to its own style from a mousemove listener on
 * the canvas, rather than by holding the pointer position in React state. That
 * is the difference between re-rendering ~280 tiles on every mouse move and
 * touching one element's `left`/`top`.
 */
function TileTooltip({
  canvasRef,
  stock,
  sparkline,
  anchor,
  canvasWidth,
  canvasHeight,
}: {
  canvasRef: React.RefObject<HTMLDivElement | null>;
  stock: TreemapStock;
  sparkline: number[] | null;
  /** Canvas-relative fallback placement, used until the pointer moves (and
   * permanently for a keyboard visitor, who has no pointer). */
  anchor: { x: number; y: number };
  canvasWidth: number;
  canvasHeight: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useIsomorphicLayoutEffect(() => {
    const el = ref.current;
    const canvas = canvasRef.current;
    if (!el) return;

    /** Flips across the cursor on whichever axes would otherwise overflow the
     * canvas. The flipped vertical placement anchors `bottom` rather than
     * computing a `top` from an estimated height, so it is exact for a tooltip
     * of any length. */
    function place(x: number, y: number) {
      const flipX = x + TOOLTIP_GAP + TOOLTIP_WIDTH > canvasWidth;
      const flipY = y + TOOLTIP_GAP + TOOLTIP_CLEARANCE > canvasHeight;
      const style = el!.style;
      if (flipX) {
        style.right = `${Math.max(TOOLTIP_EDGE_PAD, canvasWidth - x + TOOLTIP_GAP)}px`;
        style.left = "auto";
      } else {
        style.left = `${Math.max(TOOLTIP_EDGE_PAD, x + TOOLTIP_GAP)}px`;
        style.right = "auto";
      }
      if (flipY) {
        style.bottom = `${Math.max(TOOLTIP_EDGE_PAD, canvasHeight - y + TOOLTIP_GAP)}px`;
        style.top = "auto";
      } else {
        style.top = `${Math.max(TOOLTIP_EDGE_PAD, y + TOOLTIP_GAP)}px`;
        style.bottom = "auto";
      }
    }

    place(anchor.x, anchor.y);
    if (!canvas) return;

    function onMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      place(e.clientX - rect.left, e.clientY - rect.top);
    }
    canvas.addEventListener("mousemove", onMove);
    return () => canvas.removeEventListener("mousemove", onMove);
  }, [canvasRef, canvasWidth, canvasHeight, anchor.x, anchor.y]);

  const currency = stock.currency ?? "PHP";
  const turnover = stock.value ?? null;

  return (
    <div
      ref={ref}
      id={TOOLTIP_ID}
      role="tooltip"
      className="pointer-events-none absolute z-20 animate-tooltip-in rounded-xl border border-panel-border bg-panel/95 px-3.5 py-3 text-xs text-panel-fg shadow-xl shadow-black/20 backdrop-blur-sm"
      style={{ width: TOOLTIP_WIDTH }}
    >
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm font-bold tracking-tight">{stock.ticker}</span>
        {/* An untraded name gets neutral ink, not the green a `?? 0` fallback
            used to give it. */}
        <span className={`text-sm font-semibold tabular-nums ${changeInk(stock.pctChange)}`}>
          {formatPctChange(stock.pctChange)}
        </span>
      </div>
      <div className="mt-0.5 truncate text-panel-fg/72">{stock.companyName}</div>
      <div className="text-[10px] uppercase tracking-wide text-panel-fg/72">{stock.sector}</div>

      {/* Market cap and turnover were already on every quote and shown nowhere
          on this page — the two numbers that say how big a box is and how much
          of it actually changed hands today. */}
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 border-t border-panel-border pt-2 tabular-nums">
        <div>
          <dt className="text-[10px] text-panel-fg/68">Price</dt>
          <dd className="font-semibold">
            {stock.price == null ? "N/A" : `${currency === "USD" ? "$" : "₱"}${stock.price.toFixed(2)}`}
          </dd>
        </div>
        <div>
          <dt className="text-[10px] text-panel-fg/68">Market cap</dt>
          <dd className="font-semibold">{formatMagnitude(stock.marketCap, currency)}</dd>
        </div>
        {turnover != null && (
          <div>
            <dt className="text-[10px] text-panel-fg/68">Turnover</dt>
            <dd className="font-semibold">{formatMagnitude(turnover, currency)}</dd>
          </div>
        )}
        {stock.freeFloatPct != null && (
          <div>
            <dt className="text-[10px] text-panel-fg/68">Free float</dt>
            <dd className="font-semibold">{stock.freeFloatPct.toFixed(1)}%</dd>
          </div>
        )}
      </dl>

      {/* The chart gets the card's full width and its caption gets its own
          line. It used to be a 110x34 thumbnail wedged beside a "1M" label,
          under a list of sector peers — the peer list is gone (it answered a
          question nobody hovering a tile was asking, and it was pushing the one
          genuinely useful graphic down into a corner of the card). */}
      {sparkline && (
        <div className="mt-2 border-t border-panel-border pt-2">
          <div className="flex items-baseline justify-between">
            <span className="text-[10px] uppercase tracking-wide text-panel-fg/68">Last month</span>
            <span className={`text-[10px] font-semibold tabular-nums ${changeInk(sparklineChange(sparkline))}`}>
              {formatPctChange(sparklineChange(sparkline))}
            </span>
          </div>
          <Sparkline closes={sparkline} width={TOOLTIP_WIDTH - 28} height={SPARKLINE_HEIGHT} />
        </div>
      )}
      <div className="mt-1.5 text-[10px] text-panel-fg/72">Click for company info</div>
    </div>
  );
}

/**
 * The legend, below the map.
 *
 * It was a 320px-wide, ~10px-tall hairline floating in an otherwise empty band.
 * finviz's proportions are 24px-tall chips at least 50px wide with the value
 * printed inside the swatch, which is what this matches, one size up: 28px
 * chips inside a panel of their own, so the scale reads as a built component
 * rather than a strip of color that happened to land under the map. The panel
 * also gives the two things that flank the scale (what it is, and what the
 * hatching means) somewhere to sit that isn't bare page background.
 *
 * Each chip is a filter (click to isolate that band), which it always was and
 * which nothing ever signposted — hence the "Click a band to highlight" line
 * under the title.
 *
 * The scale itself stays a pure gradient of seven traded bands: an untraded
 * stock files under 0% here. A no-trade chip *inside* the strip was tried and
 * read as a foreign object on something whose whole job is to be one continuous
 * scale. It's a separate swatch on the other side of the panel now, visibly not
 * part of the ramp, which is the distinction that was missing when the caption
 * explaining the hatching moved out to the FAQ.
 */
function MapLegend({
  steps,
  activeBand,
  colorblind,
  onSelect,
}: {
  steps: number[];
  activeBand: number | null;
  colorblind: boolean;
  onSelect: (band: number | null) => void;
}) {
  // Same both-palettes-in-CSS-variables treatment as the tiles (see
  // tilePaintVars): the legend is server-rendered too, and a legend painted in
  // the wrong theme is more obviously wrong than a tile is.
  const range = steps[steps.length - 1];
  const chips = steps.map((band, i) => ({
    key: band,
    paint: tilePaintVars(band, colorblind, range),
    label: formatBandLabel(band, i, steps),
    description: bandDescription(band, i, steps),
  }));

  return (
    <div className="flex w-full max-w-[760px] flex-wrap items-center justify-center gap-x-4 gap-y-3 rounded-xl bg-panel px-4 py-3 shadow-sm shadow-black/5 ring-1 ring-panel-border">
      <div className="flex shrink-0 flex-col gap-0.5">
        <span className="kicker text-panel-fg/70">Day change</span>
        {/* The one thing about this control nothing ever said out loud, and,
            once a band is picked, the way back out of it.

            Both states are stacked in a single grid cell rather than swapped
            in and out, so this column measures the same whether or not a band
            is active and the color strip beside it never shifts when you click
            one. That is also why the button is always in the tree, merely
            invisible: rendering it conditionally is what used to nudge the
            whole row. Invisible content is still laid out, so the cell keeps
            the taller of the two heights at all times.

            map-live-only is a hook for the daily X bot, which hides this line
            before it screenshots the canvas: an instruction to click
            something, or a control to undo a click, is noise in a static
            posted image. See captureMarketMapScreenshot in
            etl/jobs/post-daily-tweet.ts. */}
        <span className="map-live-only grid grid-cols-1 grid-rows-1 items-center">
          <span
            className={`col-start-1 row-start-1 text-[10px] leading-none text-panel-fg/60 ${
              activeBand === null ? "" : "invisible"
            }`}
          >
            Click a band to highlight
          </span>
          <button
            type="button"
            onClick={() => onSelect(null)}
            aria-hidden={activeBand === null}
            tabIndex={activeBand === null ? -1 : 0}
            className={`col-start-1 row-start-1 justify-self-start rounded-md bg-panel-raised px-1.5 py-1 text-[10px] font-medium leading-none text-panel-fg/75 transition-colors hover:bg-panel-active hover:text-panel-fg ${
              activeBand === null ? "invisible pointer-events-none" : ""
            }`}
          >
            Clear filter
          </button>
        </span>
      </div>

      <div className="flex min-w-[260px] flex-1 overflow-hidden rounded-lg shadow-sm shadow-black/10 ring-1 ring-inset ring-foreground/12">
        {chips.map((chip) => {
          const isActive = activeBand === chip.key;
          const isDimmed = activeBand !== null && !isActive;
          return (
            <button
              key={String(chip.key)}
              type="button"
              onClick={() => onSelect(isActive ? null : chip.key)}
              aria-pressed={isActive}
              aria-label={`Highlight stocks ${chip.description} today`}
              title={`Highlight stocks ${chip.description} today`}
              className="treemap-tile treemap-tile-label relative flex h-7 flex-1 items-center justify-center text-[11px] font-semibold tabular-nums transition-opacity hover:brightness-110"
              style={{
                ...chip.paint,
                opacity: isDimmed ? 0.35 : 1,
                // An active chip is called out with an inset ring rather than a
                // surrounding box, so the strip's colors stay edge to edge.
                boxShadow: isActive ? "inset 0 0 0 2px var(--foreground)" : undefined,
              }}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      {/* Deliberately outside the strip and styled as a plain sample rather
          than a button: it is a key to a texture, not an eighth band of the
          scale, and it is not a filter. */}
      <div className="flex shrink-0 items-center gap-1.5">
        <span
          aria-hidden
          className="treemap-tile h-4 w-4 rounded-[3px] ring-1 ring-inset ring-foreground/15"
          style={{ ...tilePaintVars(null, colorblind, range), backgroundImage: NO_TRADE_HATCH }}
        />
        <span className="text-[11px] font-medium text-panel-fg/70">No trade</span>
      </div>
    </div>
  );
}

/** Trims a trailing ".0" so the default whole-percent steps stay clean while
 * the wider timeframes (+/-10 gives 3.3) keep their precision. */
function formatStep(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

/** The end chips are clamped, so they mean "or beyond" — the old labels read a
 * bare "-3%"/"+3%" and quietly overstated their own precision. */
function formatBandLabel(band: number, index: number, steps: number[]): string {
  if (index === 0) return `≤${formatStep(band)}%`;
  if (index === steps.length - 1) return `≥+${formatStep(band)}%`;
  return `${band > 0 ? "+" : ""}${formatStep(band)}%`;
}

function bandDescription(band: number, index: number, steps: number[]): string {
  if (index === 0) return `down ${formatStep(Math.abs(band))}% or more`;
  if (index === steps.length - 1) return `up ${formatStep(band)}% or more`;
  // The middle chip absorbs the untraded names, so its description says so
  // rather than describing a move they never made.
  if (band === 0) return "that closed flat or did not trade";
  return `around ${band > 0 ? "+" : ""}${formatStep(band)}%`;
}

/** 72, up from 34. At 34px a month of closes was a wiggle; the shape of the
 * trend only becomes readable once the vertical range is comparable to a real
 * chart's. Paired with the full-width sizing at the call site. */
const SPARKLINE_HEIGHT = 72;

/** The move across the whole sparkline window, printed beside it — a chart
 * with no axis labels can show a shape but not a magnitude. */
function sparklineChange(closes: number[]): number | null {
  const first = closes[0];
  const last = closes[closes.length - 1];
  if (first == null || last == null || first === 0) return null;
  return ((last - first) / first) * 100;
}

function Sparkline({ closes, width, height }: { closes: number[]; width: number; height: number }) {
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const trendsUp = closes[closes.length - 1] >= closes[0];
  const stroke = trendsUp ? "var(--up)" : "var(--down)";
  // Half a stroke of headroom top and bottom, or the extreme closes are drawn
  // centred on the edge of the viewBox and clipped to half their width.
  const inset = 1;
  const plotHeight = height - inset * 2;

  const coords = closes.map((close, i) => {
    const x = (i / Math.max(1, closes.length - 1)) * width;
    const y = inset + plotHeight - ((close - min) / range) * plotHeight;
    return { x, y };
  });
  const line = coords.map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  // A filled area under the line, at low opacity. At this size a bare 1.5px
  // polyline reads as thin and unfinished; the wash gives it a body without
  // introducing a second colour.
  const area = `${line} ${width.toFixed(1)},${height} 0,${height}`;

  return (
    <svg width={width} height={height} className="mt-1 block" aria-hidden="true">
      <polygon points={area} fill={stroke} opacity={0.12} />
      <polyline points={line} fill="none" stroke={stroke} strokeWidth={1.75} strokeLinejoin="round" />
    </svg>
  );
}
