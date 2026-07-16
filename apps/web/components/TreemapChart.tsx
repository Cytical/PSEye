"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  computeTreemapLayout,
  pctChangeToColor,
  getContrastText,
  shouldShowLabel,
  SECTOR_HEADER_HEIGHT,
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
}

const DEFAULT_HEIGHT = 640;
const CANVAS_BG = "#0d0f14";
const HEADER_BG = "#1c212b";
const GRID_LINE = "#05060a";

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

/**
 * Canvas is always dark, finviz-style, regardless of the site's light/dark
 * toggle — the point is a self-contained, high-contrast poster of bright
 * saturated colors, not a themed widget.
 */
export function TreemapChart({ stocks, width: widthProp, height = DEFAULT_HEIGHT, profileByTicker }: TreemapChartProps) {
  const [hovered, setHovered] = useState<TreemapStock | null>(null);
  const [selected, setSelected] = useState<TreemapStock | null>(null);
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
  const layout = computeTreemapLayout(stocks, width, height);
  const byTicker = new Map(stocks.map((s) => [s.ticker, s]));

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
    <div ref={containerRef} className="flex w-full flex-col gap-3">
      <div
        className="relative select-none overflow-hidden rounded-lg ring-1 ring-white/10"
        style={{ width, height, background: CANVAS_BG }}
        role="img"
        aria-label="PSE market map: box size is market cap, color is today's percent change"
      >
        {layout.sectors.map((sector) => (
          <div
            key={sector.sector}
            className="absolute flex items-center overflow-hidden whitespace-nowrap px-2.5 text-xs font-semibold uppercase tracking-wide text-white/80"
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
              onClick={() => stock && setSelected(stock)}
              title={`${box.ticker} ${formatPctChange(box.pctChange)} — click for details`}
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
          <div className="pointer-events-none absolute bottom-3 left-3 min-w-[190px] rounded-lg border border-white/15 bg-[#12141a]/95 px-3.5 py-3 text-xs text-white shadow-2xl backdrop-blur-sm">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-sm font-bold tracking-tight">{hovered.ticker}</span>
              <span
                className={`text-sm font-semibold ${
                  hovered.pctChange == null
                    ? "text-white/50"
                    : hovered.pctChange >= 0
                      ? "text-[#30cc5a]"
                      : "text-[#f6362f]"
                }`}
              >
                {formatPctChange(hovered.pctChange)}
              </span>
            </div>
            <div className="mt-0.5 truncate text-white/60">{hovered.companyName}</div>
            <div className="text-[10px] uppercase tracking-wide text-white/40">{hovered.sector}</div>
            <div className="mt-1.5 font-semibold">
              {hovered.price == null
                ? "N/A"
                : `${hovered.currency === "USD" ? "$" : "₱"}${hovered.price.toFixed(2)}`}
            </div>
            {sparkline && (
              <div className="mt-2 flex items-center gap-1.5 border-t border-white/10 pt-2">
                <Sparkline closes={sparkline} />
                <span className="text-[10px] text-white/50">1M</span>
              </div>
            )}
            <div className="mt-1.5 text-[10px] text-white/35">Click for company info</div>
          </div>
        )}
      </div>

      {selected && (
        <CompanyDetailPanel
          stock={selected}
          profile={profileByTicker?.[selected.ticker] ?? null}
          rank={rankByTicker.get(selected.ticker) ?? 1}
          totalCount={stocks.length}
          onClose={() => setSelected(null)}
        />
      )}
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
