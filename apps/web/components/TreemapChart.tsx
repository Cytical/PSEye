"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  computeTreemapLayout,
  pctChangeToColor,
  getContrastText,
  shouldShowLabel,
  SECTOR_HEADER_HEIGHT,
  LEGEND_GRADIENT_CSS,
  LEGEND_TICKS,
  NO_DATA_COLOR,
  type TreemapInput,
} from "@pseye/treemap-layout";
import { generateSparklineHistory } from "@/lib/syntheticSparkline";
import type { CompanyProfile } from "@/lib/companyProfiles";
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

const DEFAULT_HEIGHT = 640;
// CSS custom properties, not JS constants, so the canvas chrome re-themes
// with the rest of the market map (see --panel-* in globals.css) — box fill
// colors below stay data-driven (pctChangeToColor) regardless of theme.
const CANVAS_BG = "var(--panel-canvas)";
const HEADER_BG = "var(--panel-bg-raised)";
const GRID_LINE = "var(--panel-grid)";

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
 * active site theme via the --panel-* CSS vars; box fill colors stay a
 * finviz-style poster of bright, saturated, data-driven colors regardless
 * of theme, since those encode real information (percent change).
 */
export function TreemapChart({
  stocks,
  width: widthProp,
  height = DEFAULT_HEIGHT,
  profileByTicker,
  onAddTileClick,
}: TreemapChartProps) {
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

  const sparkline = useMemo(
    () => (hovered?.price != null ? generateSparklineHistory(hovered.ticker, hovered.price) : null),
    [hovered]
  );

  /** 1-based market-cap rank among the stocks currently shown (respects the active filter) — shown in the detail panel. */
  const rankByTicker = useMemo(() => {
    const ranked = [...stocks].sort((a, b) => b.marketCap - a.marketCap);
    return new Map(ranked.map((s, i) => [s.ticker, i + 1]));
  }, [stocks]);

  return (
    <div ref={containerRef} className="flex w-full flex-col items-center gap-3">
      <div
        className="relative select-none overflow-hidden rounded-lg ring-1 ring-panel-border"
        style={{ width, height, background: CANVAS_BG }}
        role="img"
        aria-label="PSE market map: box size is market cap, color is today's percent change"
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
                onClick={onAddTileClick}
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

          const fill = pctChangeToColor(box.pctChange);
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
              onClick={() => stock && selectTickerInUrl(stock.ticker)}
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

        {hovered && !selected && (
          <div className="pointer-events-none absolute bottom-3 left-3 min-w-[190px] rounded-lg border border-panel-border bg-panel/95 px-3.5 py-3 text-xs text-panel-fg shadow-2xl backdrop-blur-sm">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-bold tracking-tight">{hovered.ticker}</span>
              <span
                className={`text-sm font-semibold ${
                  hovered.pctChange == null
                    ? "text-panel-fg/50"
                    : hovered.pctChange >= 0
                      ? "text-[#30cc5a]"
                      : "text-[#f6362f]"
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
        <span className="text-[10px] font-medium uppercase tracking-wide text-black/60 dark:text-white/60">
          Day change
        </span>
        <div className="w-full">
          <div
            className="h-2.5 w-full rounded-full ring-1 ring-inset ring-black/10 dark:ring-white/10"
            style={{ background: LEGEND_GRADIENT_CSS }}
          />
          <div className="flex w-full justify-between text-[10px] font-medium text-black/60 dark:text-white/60">
            {LEGEND_TICKS.map((tick) => (
              <span key={tick}>
                {tick > 0 ? "+" : ""}
                {tick}%
              </span>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-black/60 dark:text-white/60">
          <span
            className="h-2.5 w-2.5 rounded-sm ring-1 ring-inset ring-black/10 dark:ring-white/10"
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
  const stroke = trendsUp ? "#30cc5a" : "#f6362f";

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
