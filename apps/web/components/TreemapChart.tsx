"use client";

import { useState } from "react";
import {
  computeTreemapLayout,
  pctChangeToColor,
  getContrastText,
  shouldShowLabel,
  type TreemapInput,
} from "@pseye/treemap-layout";

export interface TreemapStock extends TreemapInput {
  companyName: string;
  price: number;
}

interface TreemapChartProps {
  stocks: TreemapStock[];
  width?: number;
  height?: number;
}

const LEGEND_STOPS = [-3, -1.5, 0, 1.5, 3];

export function TreemapChart({ stocks, width = 1000, height = 600 }: TreemapChartProps) {
  const [hovered, setHovered] = useState<TreemapStock | null>(null);
  const layout = computeTreemapLayout(stocks, width, height);
  const byTicker = new Map(stocks.map((s) => [s.ticker, s]));

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative select-none"
        style={{ width, height, maxWidth: "100%" }}
        role="img"
        aria-label="PSE market map: box size is market cap, color is today's percent change"
      >
        {layout.sectors.map((sector) => (
          <div
            key={sector.sector}
            className="absolute text-[11px] font-medium text-black/60 dark:text-white/60"
            style={{ left: sector.x0, top: sector.y0 - 18, width: sector.x1 - sector.x0 }}
          >
            {sector.sector}
          </div>
        ))}

        {layout.stocks.map((box) => {
          const w = box.x1 - box.x0;
          const h = box.y1 - box.y0;
          const fill = pctChangeToColor(box.pctChange, "light");
          const ink = getContrastText(fill);
          const showLabel = shouldShowLabel(w, h);
          const stock = byTicker.get(box.ticker);

          return (
            <button
              key={box.ticker}
              type="button"
              className="absolute flex flex-col items-center justify-center overflow-hidden border border-black/5 text-center transition-[filter] hover:brightness-95"
              style={{
                left: box.x0,
                top: box.y0,
                width: w,
                height: h,
                backgroundColor: fill,
                color: ink,
              }}
              onMouseEnter={() => stock && setHovered(stock)}
              onMouseLeave={() => setHovered(null)}
              onFocus={() => stock && setHovered(stock)}
              onBlur={() => setHovered(null)}
              title={`${box.ticker} ${box.pctChange >= 0 ? "+" : ""}${box.pctChange.toFixed(2)}%`}
            >
              {showLabel && (
                <>
                  <span className="text-xs font-semibold leading-tight">{box.ticker}</span>
                  <span className="text-[10px] leading-tight">
                    {box.pctChange >= 0 ? "+" : ""}
                    {box.pctChange.toFixed(2)}%
                  </span>
                </>
              )}
            </button>
          );
        })}

        {hovered && (
          <div className="pointer-events-none absolute bottom-2 left-2 rounded-md border border-black/10 bg-white/95 px-3 py-2 text-xs shadow-sm dark:border-white/10 dark:bg-black/90">
            <div className="font-semibold">
              {hovered.ticker} &middot; {hovered.companyName}
            </div>
            <div className="opacity-70">{hovered.sector}</div>
            <div>
              ₱{hovered.price.toFixed(2)} ({hovered.pctChange >= 0 ? "+" : ""}
              {hovered.pctChange.toFixed(2)}%)
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-[11px] text-black/60 dark:text-white/60">
        <span>Down</span>
        <div className="flex h-3 flex-1 max-w-xs overflow-hidden rounded">
          {LEGEND_STOPS.slice(0, -1).map((stop, i) => (
            <div
              key={stop}
              className="flex-1"
              style={{
                background: `linear-gradient(to right, ${pctChangeToColor(stop, "light")}, ${pctChangeToColor(LEGEND_STOPS[i + 1], "light")})`,
              }}
            />
          ))}
        </div>
        <span>Up</span>
      </div>
    </div>
  );
}
