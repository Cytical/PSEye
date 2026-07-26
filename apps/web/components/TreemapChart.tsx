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

  useEffect(() => {
    if (widthProp != null) return;
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setMeasuredWidth(Math.floor(w));
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
  // measuring it above) never changes size — only what's painted inside it does. ----
  const canvasBoxRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const isDraggingRef = useRef(false);
  const didDragRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  // Reset any zoom/pan when the underlying stock set changes (switching
  // filters, jumping to a past date) — a stale zoom pointed at boxes that
  // just moved or vanished would be more confusing than starting fresh.
  // Done during render (React's documented "adjusting state when a prop
  // changes" pattern), not in an effect, to avoid an extra render pass.
  const [prevStocksForReset, setPrevStocksForReset] = useState(stocks);
  if (stocks !== prevStocksForReset) {
    setPrevStocksForReset(stocks);
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  // Wheel needs to call preventDefault (so scrolling over the map zooms it
  // instead of scrolling the page), which React's synthetic onWheel can't
  // reliably do — it's attached passively. A plain addEventListener with
  // {passive:false} is the standard workaround.
  useEffect(() => {
    const el = canvasBoxRef.current;
    if (!el) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * ZOOM_WHEEL_SENSITIVITY);
      setZoom((z) => clampZoom(z * factor));
    }
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  function clampZoom(z: number): number {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
  }

  /** Keeps the pan offset from pushing the zoomed content entirely out of the
   * canvas's own frame — at zoom `z`, the content is `z` times the canvas
   * size, so it can shift by up to half the extra size in each direction
   * before the far edge would show empty canvas instead of content. */
  function clampPan(next: { x: number; y: number }, z: number): { x: number; y: number } {
    const maxX = (width * (z - 1)) / 2;
    const maxY = (height * (z - 1)) / 2;
    return {
      x: Math.min(maxX, Math.max(-maxX, next.x)),
      y: Math.min(maxY, Math.max(-maxY, next.y)),
    };
  }

  function zoomBy(factor: number) {
    setZoom((z) => clampZoom(z * factor));
  }

  function resetZoom() {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }

  function onCanvasPointerDown(e: React.PointerEvent) {
    if (zoom <= 1) return;
    isDraggingRef.current = true;
    didDragRef.current = false;
    dragStartRef.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
    e.currentTarget.setPointerCapture(e.pointerId);
  }

  function onCanvasPointerMove(e: React.PointerEvent) {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - dragStartRef.current.x;
    const dy = e.clientY - dragStartRef.current.y;
    if (Math.abs(dx) > DRAG_THRESHOLD || Math.abs(dy) > DRAG_THRESHOLD) didDragRef.current = true;
    setPan(clampPan({ x: dragStartRef.current.panX + dx, y: dragStartRef.current.panY + dy }, zoom));
  }

  function onCanvasPointerUp() {
    isDraggingRef.current = false;
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
        className="relative select-none overflow-hidden rounded-xl shadow-sm shadow-black/10 ring-1 ring-panel-border"
        style={{ width, height, background: CANVAS_BG }}
        role="group"
        aria-label="PSE market map: box size is market cap, color is today's percent change. Scroll to zoom, drag to pan."
      >
        {/* Zoom/pan transform layer — scaling/translating this instead of the
            canvas box above keeps the box's own footprint (and the width
            ResizeObserver watches) fixed; only the painted content moves. */}
        <div
          className="absolute inset-0"
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "center center",
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
                className="absolute flex flex-col items-center justify-center gap-1 overflow-hidden rounded-sm border-2 border-dashed border-panel-border text-panel-fg/45 transition-colors hover:border-panel-fg/50 hover:bg-panel-raised hover:text-panel-fg/80"
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
          const showLabel = shouldShowLabel(w, h);
          const stock = byTicker.get(box.ticker);
          const isHovered = hovered?.ticker === box.ticker;
          const fontSize = tickerFontSize(w, h);

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
                  <span className="leading-tight opacity-90" style={{ fontSize: Math.max(10, fontSize * 0.52) }}>
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
                    ? "text-panel-fg/50"
                    : hovered.pctChange >= 0
                      ? "text-up"
                      : "text-down"
                }`}
              >
                {formatPctChange(hovered.pctChange)}
              </span>
            </div>
            <div className="mt-0.5 truncate text-panel-fg/60">{hovered.companyName}</div>
            <div className="text-[10px] uppercase tracking-wide text-panel-fg/60">{hovered.sector}</div>
            <div className="mt-1.5 font-semibold">
              {hovered.price == null
                ? "N/A"
                : `${hovered.currency === "USD" ? "$" : "₱"}${hovered.price.toFixed(2)}`}
            </div>
            {sparkline && (
              <div className="mt-2 flex items-center gap-1.5 border-t border-panel-border pt-2">
                <Sparkline closes={sparkline} />
                <span className="text-[10px] text-panel-fg/50">1M</span>
              </div>
            )}
            <div className="mt-1.5 text-[10px] text-panel-fg/60">Click for company info</div>
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
        <span className="kicker text-foreground/55">Day change</span>
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
          <div className="flex w-full justify-between text-[10px] font-medium text-foreground/55">
            {LEGEND_BANDS.map((band) => (
              <span key={band}>
                {band > 0 ? "+" : ""}
                {band}%
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-foreground/55">
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
