"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  computeTreemapLayout,
  pctChangeToColor,
  getContrastText,
  shouldShowLabel,
  SECTOR_HEADER_HEIGHT,
  LEGEND_BANDS,
  NO_DATA_COLOR,
  type TreemapInput,
} from "@pseye/treemap-layout";
import type { CompanyProfile } from "@/lib/companyProfiles";
import { useColorTheme } from "@/lib/useColorTheme";
import { useColorblindMode } from "@/lib/colorblindMode";
import { CompanyDetailPanel } from "./CompanyDetailPanel";

export interface TreemapStock extends TreemapInput {
  companyName: string;
  /** null when the source has no current trade to report — render as "N/A". */
  price: number | null;
  /** Defaults to PHP (PSE stocks). Nasdaq 100 mock data sets this to USD. */
  currency?: "PHP" | "USD";
}

function formatPctChange(pctChange: number | null): string {
  if (pctChange === null) return "N/A";
  return `${pctChange >= 0 ? "+" : ""}${pctChange.toFixed(2)}%`;
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
}

/** Sentinel ticker/sector for the synthetic "+" tile injected into the layout
 * input (never present in `stocks`) — computeTreemapLayout treats it like any
 * other entry, weighted so it claims 1/(N+1) of the canvas (see the comment
 * on `layoutInput` below), which is what makes it resize itself down as more
 * stocks get bookmarked rather than sitting at a fixed pixel size. */
const ADD_TILE_TICKER = "__pseye_add_watchlist_tile__";
const ADD_TILE_SECTOR = "__pseye_add_watchlist_sector__";

const DEFAULT_HEIGHT = 760;
// CSS custom properties, not JS constants, so the canvas chrome re-themes
// with the rest of the market map (see --panel-* in globals.css) — box fill
// colors below stay data-driven (pctChangeToColor) regardless of theme.
const CANVAS_BG = "var(--panel-canvas)";
const HEADER_BG = "var(--panel-bg-raised)";
const GRID_LINE = "var(--panel-grid)";

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
/** How much a wheel tick changes zoom — tuned so a normal scroll gesture feels
 * gradual rather than jumping several steps at once. */
const ZOOM_WHEEL_SENSITIVITY = 0.0015;

function clampZoom(z: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
}
/** Below this pointer movement (px), a mousedown+mouseup is treated as a click
 * on the stock tile underneath rather than a pan drag. */
const DRAG_THRESHOLD = 4;

/**
 * finviz scales ticker text with box size rather than using one fixed size —
 * a mega-cap's box reads like a headline, a small-cap's like a footnote.
 * Clamped so text never dips below legible or blows past the box.
 */
const TICKER_FONT_MIN = 12;
const TICKER_FONT_MAX = 28;

function tickerFontSize(width: number, height: number): number {
  const bySize = Math.min(width, height) / 3.6;
  return Math.max(TICKER_FONT_MIN, Math.min(TICKER_FONT_MAX, bySize));
}

/** Fired after history.replaceState so useSyncExternalStore knows to re-read the URL
 * (replaceState doesn't dispatch popstate on its own) — same pattern as MarketMap.tsx's filter sync. */
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
  height = DEFAULT_HEIGHT,
  profileByTicker,
  sparklineByTicker,
  onAddTileClick,
}: TreemapChartProps) {
  const colorTheme = useColorTheme();
  const colorblind = useColorblindMode();
  const [hovered, setHovered] = useState<TreemapStock | null>(null);
  // Synced to the `?ticker=` URL param (server snapshot null so hydration never mismatches
  // a client that might land on a deep-linked ticker) — makes "look at this stock" shareable.
  const selectedTicker = useSyncExternalStore(subscribeToTickerUrl, getTickerFromUrl, (): string | null => null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [measuredWidth, setMeasuredWidth] = useState(widthProp ?? 1000);
  /**
   * Whether measuredWidth is a real measurement yet, as opposed to the 1000px
   * placeholder. The canvas used to be painted at that placeholder width and
   * then snap to the measured one, which was the largest layout-shift source
   * on the homepage (measured: the canvas box jumping 1000px -> 1023px, and in
   * another load 910px -> 930px). The box itself is now sized by CSS so it is
   * correct in the very first paint, and the tiles — which are absolutely
   * positioned from layout coordinates that genuinely do need the pixel width
   * — wait one frame for it. Elements appearing don't count as layout shift;
   * elements moving do.
   */
  const [hasMeasured, setHasMeasured] = useState(widthProp != null);

  useEffect(() => {
    if (widthProp != null) return;
    const el = containerRef.current;
    if (!el) return;
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
  const byTicker = useMemo(() => new Map(stocks.map((s) => [s.ticker, s])), [stocks]);
  const selected = selectedTicker ? (byTicker.get(selectedTicker) ?? null) : null;

  const sparkline = hovered ? (sparklineByTicker?.[hovered.ticker] ?? null) : null;

  /** 1-based market-cap rank among the stocks currently shown (respects the active filter) — shown in the detail panel. */
  const rankByTicker = useMemo(() => {
    const ranked = [...stocks].sort((a, b) => b.marketCap - a.marketCap);
    return new Map(ranked.map((s, i) => [s.ticker, i + 1]));
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
  // pointer 1:1 instead of visibly lagging behind it; only zoom changes (wheel,
  // buttons, reset) should glide.
  const [isPanning, setIsPanning] = useState(false);
  // Tracks a pointer that's down and might turn into a drag; only promoted to
  // an actual captured drag once movement crosses DRAG_THRESHOLD (see
  // onCanvasPointerMove) — capturing immediately on pointerdown made every
  // click while zoomed retarget its `click` event to this layer instead of
  // the stock tile button underneath, since Chromium retargets `click` (not
  // just the pointer events) to whichever element holds pointer capture.
  const isDraggingRef = useRef(false);
  const didDragRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0, pointerId: 0 });

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
    setView((prev) => {
      const nextZoom = clampZoom(prev.zoom * factor);
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
  useEffect(() => {
    const el = canvasBoxRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const rect = el!.getBoundingClientRect();
      const factor = Math.exp(-e.deltaY * ZOOM_WHEEL_SENSITIVITY);
      zoomAtPoint(factor, e.clientX - rect.left, e.clientY - rect.top);
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- zoomAtPoint is a plain function redefined each render but only closes over stable setState/clampZoom/clampPan (which in turn close over width/height, already listed below).
  }, [width, height]);

  function zoomBy(factor: number) {
    // No cursor position for a button click — zoom toward the canvas center.
    zoomAtPoint(factor, width / 2, height / 2);
  }

  function resetZoom() {
    setView({ zoom: 1, pan: { x: 0, y: 0 } });
  }

  function onCanvasPointerDown(e: React.PointerEvent) {
    if (zoom <= 1) return;
    isDraggingRef.current = true;
    didDragRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y, pointerId: e.pointerId };
    // Deliberately NOT calling setPointerCapture here — see the isDraggingRef
    // comment above. Capture is deferred to onCanvasPointerMove, once actual
    // dragging (not just a click) is confirmed.
  }

  function onCanvasPointerMove(e: React.PointerEvent) {
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

  function onCanvasPointerUp() {
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

  return (
    <div ref={containerRef} className="flex w-full flex-col items-center gap-3">
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
        style={{ width: widthProp, height, background: CANVAS_BG }}
        role="group"
        aria-label="PSE market map: box size is market cap, color is today's percent change. Scroll to zoom, drag to pan."
      >
        {/* Zoom/pan transform layer — scaling/translating this instead of the
            canvas box above keeps the box's own footprint (and the width
            ResizeObserver watches) fixed; only the painted content moves. */}
        <div
          className="absolute inset-0"
          hidden={!hasMeasured}
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
            transition: isPanning ? "none" : "transform 200ms cubic-bezier(0.22, 1, 0.36, 1)",
            cursor: zoom > 1 ? "grab" : undefined,
            touchAction: zoom > 1 ? "none" : undefined,
          }}
          onPointerDown={onCanvasPointerDown}
          onPointerMove={onCanvasPointerMove}
          onPointerUp={onCanvasPointerUp}
          onPointerCancel={onCanvasPointerUp}
        >
        {layout.sectors
          .filter((sector) => sector.sector !== ADD_TILE_SECTOR)
          .map((sector) => (
          <div
            key={sector.sector}
            className="absolute flex items-center overflow-hidden whitespace-nowrap px-2.5 text-xs font-semibold uppercase tracking-wide text-panel-fg/80"
            style={{
              left: sector.x0,
              top: sector.y0,
              width: sector.x1 - sector.x0,
              height: SECTOR_HEADER_HEIGHT,
              background: HEADER_BG,
              borderBottom: `1px solid ${GRID_LINE}`,
            }}
          >
            {sector.sector}
          </div>
        ))}

        {layout.stocks.map((box) => {
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
                style={{ left: box.x0, top: box.y0, width: w, height: h }}
              >
                <svg width={iconSize} height={iconSize} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
                {w > 70 && h > 46 && <span className="text-xs font-medium">Add stock</span>}
              </button>
            );
          }

          const fill = pctChangeToColor(box.pctChange, colorTheme, colorblind);
          const ink = getContrastText(fill);
          // Evaluated against the on-screen (zoomed) size, not the raw layout
          // size — so a small-cap box too tiny to label at 1x reveals its
          // ticker once zooming in has made it big enough to read, instead of
          // staying permanently blank the way a fixed layout-time decision would.
          const showLabel = shouldShowLabel(w * zoom, h * zoom);
          const stock = byTicker.get(box.ticker);
          const isHovered = hovered?.ticker === box.ticker;
          // The whole transform layer (including this text) is scaled by
          // `zoom` via CSS, so a font-size computed from the raw (unzoomed)
          // box would get magnified right along with the box — fine for a
          // box that was already big enough to show a label at 1x, but for a
          // tiny small-cap box that only clears shouldShowLabel's threshold
          // once zoomed in, tickerFontSize(w, h) floors at TICKER_FONT_MIN
          // regardless of how small the raw box actually is, so the text
          // already overflows the box before the CSS scale even applies —
          // zooming in just magnifies that overflow. Computing against the
          // on-screen size and dividing back out by zoom sizes the text to
          // the box the user actually sees, at any zoom level.
          const fontSize = tickerFontSize(w * zoom, h * zoom) / zoom;

          return (
            <button
              key={box.ticker}
              type="button"
              className="absolute flex flex-col items-center justify-center overflow-hidden text-center transition-[filter,box-shadow] duration-100 hover:z-10 hover:brightness-125"
              style={{
                left: box.x0,
                top: box.y0,
                width: w,
                height: h,
                backgroundColor: fill,
                color: ink,
                border: `1px solid ${GRID_LINE}`,
                boxShadow: isHovered ? "inset 0 0 0 2px rgba(255,255,255,0.85)" : undefined,
              }}
              onMouseEnter={() => stock && setHovered(stock)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => stock && setHovered(stock)}
              onBlur={() => setHovered(null)}
              onClick={() => stock && selectTickerUnlessDragged(stock.ticker)}
              title={`${box.ticker} ${formatPctChange(box.pctChange)} — click for details`}
              aria-label={`${box.ticker}${stock ? `, ${stock.companyName}` : ""}, ${formatPctChange(box.pctChange)} today`}
            >
              {showLabel && (
                <>
                  <span className="font-bold leading-tight tracking-tight" style={{ fontSize }}>
                    {box.ticker}
                  </span>
                  <span
                    className="leading-tight opacity-90"
                    // The 10px floor is an on-screen minimum, so it has to be
                    // divided by zoom too, same as `fontSize` above — a bare
                    // `Math.max(10, ...)` here is a fixed unscaled value that
                    // the CSS zoom transform would then amplify (e.g. 40px on
                    // screen at 4x zoom), overflowing the box exactly like
                    // the primary ticker font did before that fix.
                    style={{ fontSize: Math.max(10 / zoom, fontSize * 0.52) }}
                  >
                    {formatPctChange(box.pctChange)}
                  </span>
                </>
              )}
            </button>
          );
        })}
        </div>

        {/* Zoom controls — siblings of the transform layer above, not children
            of it, so they stay fixed-size and fixed-position regardless of
            zoom/pan. */}
        <div className="absolute bottom-3 right-3 flex flex-col overflow-hidden rounded-lg ring-1 ring-panel-border shadow-sm shadow-black/10">
          <button
            type="button"
            onClick={() => zoomBy(1.4)}
            disabled={zoom >= MAX_ZOOM}
            aria-label="Zoom in"
            className="flex h-7 w-7 items-center justify-center bg-panel text-sm font-semibold text-panel-fg/70 transition-colors hover:bg-panel-raised hover:text-panel-fg disabled:opacity-40"
          >
            +
          </button>
          <button
            type="button"
            onClick={() => zoomBy(1 / 1.4)}
            disabled={zoom <= MIN_ZOOM}
            aria-label="Zoom out"
            className="flex h-7 w-7 items-center justify-center border-t border-panel-border bg-panel text-sm font-semibold text-panel-fg/70 transition-colors hover:bg-panel-raised hover:text-panel-fg disabled:opacity-40"
          >
            −
          </button>
        </div>
        {zoom > 1 && (
          <button
            type="button"
            onClick={resetZoom}
            // top-left, not bottom-left — the hover tooltip already lives at
            // bottom-3 left-3 and the two would otherwise overlap.
            className="absolute top-3 left-3 rounded-lg bg-panel px-2.5 py-1 text-[11px] font-medium text-panel-fg/70 ring-1 ring-panel-border transition-colors hover:bg-panel-raised hover:text-panel-fg"
          >
            Reset zoom
          </button>
        )}

        {hovered && !selected && (
          <div className="pointer-events-none absolute bottom-3 left-3 min-w-[190px] rounded-xl border border-panel-border bg-panel/95 px-3.5 py-3 text-xs text-panel-fg shadow-xl shadow-black/20 backdrop-blur-sm">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-bold tracking-tight">{hovered.ticker}</span>
              <span
                className={`text-sm font-semibold ${
                  hovered.pctChange == null
                    ? "text-panel-fg/68"
                    : hovered.pctChange >= 0
                      ? "text-up"
                      : "text-down"
                }`}
              >
                {formatPctChange(hovered.pctChange)}
              </span>
            </div>
            <div className="mt-0.5 truncate text-panel-fg/72">{hovered.companyName}</div>
            <div className="text-[10px] uppercase tracking-wide text-panel-fg/72">{hovered.sector}</div>
            <div className="mt-1.5 font-semibold">
              {hovered.price == null
                ? "N/A"
                : `${hovered.currency === "USD" ? "$" : "₱"}${hovered.price.toFixed(2)}`}
            </div>
            {sparkline && (
              <div className="mt-2 flex items-center gap-1.5 border-t border-panel-border pt-2">
                <Sparkline closes={sparkline} />
                <span className="text-[10px] text-panel-fg/68">1M</span>
              </div>
            )}
            <div className="mt-1.5 text-[10px] text-panel-fg/72">Click for company info</div>
          </div>
        )}
      </div>

      {selected && (
        <CompanyDetailPanel
          stock={selected}
          profile={profileByTicker?.[selected.ticker] ?? null}
          rank={rankByTicker.get(selected.ticker) ?? 1}
          totalCount={stocks.length}
          onClose={() => selectTickerInUrl(null)}
        />
      )}

      <div className="flex w-full max-w-xs flex-col items-center gap-1.5">
        <span className="kicker text-foreground/68">Day change</span>
        <div className="w-full">
          {/* finviz-style discrete bands, not a gradient — matches what the
              map's boxes actually render (see LEGEND_BANDS/bandFor in
              @pseye/treemap-layout). */}
          <div className="flex w-full overflow-hidden rounded-md ring-1 ring-inset ring-foreground/10">
            {LEGEND_BANDS.map((band) => (
              <div
                key={band}
                className="h-2.5 flex-1"
                style={{ background: pctChangeToColor(band, colorTheme, colorblind) }}
              />
            ))}
          </div>
          <div className="flex w-full justify-between text-[10px] font-medium text-foreground/68">
            {LEGEND_BANDS.map((band) => (
              <span key={band}>
                {band > 0 ? "+" : ""}
                {band}%
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-foreground/68">
          <span
            className="h-2.5 w-2.5 rounded-sm ring-1 ring-inset ring-foreground/10"
            style={{ background: NO_DATA_COLOR }}
          />
          No trade today
        </div>
      </div>
    </div>
  );
}

const SPARKLINE_WIDTH = 110;
const SPARKLINE_HEIGHT = 34;

function Sparkline({ closes }: { closes: number[] }) {
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const range = max - min || 1;
  const trendsUp = closes[closes.length - 1] >= closes[0];
  const stroke = trendsUp ? "var(--up)" : "var(--down)";

  const points = closes
    .map((close, i) => {
      const x = (i / (closes.length - 1)) * SPARKLINE_WIDTH;
      const y = SPARKLINE_HEIGHT - ((close - min) / range) * SPARKLINE_HEIGHT;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width={SPARKLINE_WIDTH} height={SPARKLINE_HEIGHT} className="shrink-0">
      <polyline points={points} fill="none" stroke={stroke} strokeWidth={1.5} />
    </svg>
  );
}
