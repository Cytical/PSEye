"use client";

import { useMemo, useState } from "react";
import type { PortfolioHistoryPoint } from "@/lib/portfolio";

// Same categorical slot DcaChart.tsx uses for its "value" line — this is the
// same kind of series (a value over time), so it keeps the visual vocabulary
// consistent across the two charts.
const COLOR_VALUE_LIGHT = "#2a78d6";
const COLOR_VALUE_DARK = "#3987e5";

const WIDTH = 720;
const HEIGHT = 260;
const PAD_LEFT = 64;
const PAD_RIGHT = 12;
const PAD_TOP = 16;
const PAD_BOTTOM = 12;

function currency(n: number): string {
  return `₱${Math.round(n).toLocaleString("en-PH")}`;
}

/** Line chart of what current holdings would be worth over time, with a
 * dashed reference line at today's cost basis so a viewer can read gain/loss
 * against the trend at a glance, not just at the rightmost point. */
export function PortfolioHistoryChart({
  history,
  costBasis,
}: {
  history: PortfolioHistoryPoint[];
  costBasis: number;
}) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const { xForIndex, yForValue, plotWidth, plotHeight, yTicks } = useMemo(() => {
    const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
    const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
    const maxValue = Math.max(...history.map((p) => p.value), costBasis, 1);
    const xForIndex = (i: number) =>
      PAD_LEFT + (history.length <= 1 ? 0 : (i / (history.length - 1)) * plotWidth);
    const yForValue = (v: number) => PAD_TOP + plotHeight - (v / maxValue) * plotHeight;
    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * maxValue);
    return { xForIndex, yForValue, plotWidth, plotHeight, yTicks };
  }, [history, costBasis]);

  if (history.length === 0) return null;

  const valuePath = history
    .map((p, i) => `${i === 0 ? "M" : "L"}${xForIndex(i)},${yForValue(p.value)}`)
    .join(" ");

  const hover = hoverIndex !== null ? history[hoverIndex] : null;

  function handleMove(e: React.PointerEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setHoverIndex(Math.round(ratio * (history.length - 1)));
  }

  return (
    <div
      className="portfolio-history-chart"
      style={{ "--series-value": COLOR_VALUE_LIGHT } as React.CSSProperties}
    >
      <style>{`
        .portfolio-history-chart { color-scheme: light; }
        @media (prefers-color-scheme: dark) {
          :root:where(:not([data-theme="light"])) .portfolio-history-chart {
            --series-value: ${COLOR_VALUE_DARK};
          }
        }
        :root[data-theme="dark"] .portfolio-history-chart {
          --series-value: ${COLOR_VALUE_DARK};
        }
      `}</style>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label="Value of your current holdings over time"
      >
        {yTicks.map((t) => (
          <g key={t}>
            <line
              x1={PAD_LEFT}
              x2={WIDTH - PAD_RIGHT}
              y1={yForValue(t)}
              y2={yForValue(t)}
              className="stroke-panel-fg/10"
              strokeWidth={1}
            />
            <text
              x={PAD_LEFT - 8}
              y={yForValue(t)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={10}
              className="fill-panel-fg/65"
            >
              {currency(t)}
            </text>
          </g>
        ))}

        <line
          x1={PAD_LEFT}
          x2={WIDTH - PAD_RIGHT}
          y1={yForValue(costBasis)}
          y2={yForValue(costBasis)}
          className="stroke-panel-fg/35"
          strokeWidth={1.5}
          strokeDasharray="4,3"
        />

        <path
          d={valuePath}
          fill="none"
          stroke="var(--series-value)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {hover && hoverIndex !== null && (
          <>
            <line
              x1={xForIndex(hoverIndex)}
              x2={xForIndex(hoverIndex)}
              y1={PAD_TOP}
              y2={HEIGHT - PAD_BOTTOM}
              className="stroke-panel-fg/30"
              strokeWidth={1}
              strokeDasharray="2,2"
            />
            <circle cx={xForIndex(hoverIndex)} cy={yForValue(hover.value)} r={3.5} fill="var(--series-value)" />
          </>
        )}

        <rect
          x={PAD_LEFT}
          y={PAD_TOP}
          width={plotWidth}
          height={plotHeight}
          fill="transparent"
          onPointerMove={handleMove}
          onPointerLeave={() => setHoverIndex(null)}
        />
      </svg>

      <div className="mt-1 flex flex-wrap items-center gap-4 text-[11px] text-panel-fg/72">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--series-value)" }} />
          Value of current holdings
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-1.5 w-3 rounded-full border-t-2 border-dashed border-panel-fg/50" />
          Today&apos;s cost basis
        </span>
        {hover && (
          <span className="ml-auto tabular-nums">
            {hover.date} &middot; {currency(hover.value)}
          </span>
        )}
      </div>
    </div>
  );
}
