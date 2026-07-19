"use client";

import { useMemo, useState } from "react";
import type { DcaPoint } from "@/lib/dca";

// Categorical slots 1 (blue) and 2 (aqua) from the dataviz palette — deliberately
// distinct from the green/red diverging scheme TreemapChart uses for % change,
// since these two lines are identities (value vs. contributions), not polarity.
const COLOR_VALUE_LIGHT = "#2a78d6";
const COLOR_VALUE_DARK = "#3987e5";
const COLOR_CONTRIBUTED_LIGHT = "#1baf7a";
const COLOR_CONTRIBUTED_DARK = "#199e70";

const WIDTH = 720;
const HEIGHT = 280;
const PAD_LEFT = 64;
const PAD_RIGHT = 12;
const PAD_TOP = 16;
const PAD_BOTTOM = 12;

function currency(n: number): string {
  return `₱${Math.round(n).toLocaleString("en-PH")}`;
}

export function DcaChart({ timeline }: { timeline: DcaPoint[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const { xForIndex, yForValue, plotWidth, plotHeight, yTicks } = useMemo(() => {
    const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
    const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
    const maxValue = Math.max(...timeline.map((p) => Math.max(p.contributed, p.value)), 1);
    const xForIndex = (i: number) =>
      PAD_LEFT + (timeline.length <= 1 ? 0 : (i / (timeline.length - 1)) * plotWidth);
    const yForValue = (v: number) => PAD_TOP + plotHeight - (v / maxValue) * plotHeight;
    const yTicks = [0, 0.25, 0.5, 0.75, 1].map((t) => t * maxValue);
    return { xForIndex, yForValue, plotWidth, plotHeight, yTicks };
  }, [timeline]);

  if (timeline.length === 0) return null;

  const contributedPath = timeline
    .map((p, i) => `${i === 0 ? "M" : "L"}${xForIndex(i)},${yForValue(p.contributed)}`)
    .join(" ");
  const valuePath = timeline
    .map((p, i) => `${i === 0 ? "M" : "L"}${xForIndex(i)},${yForValue(p.value)}`)
    .join(" ");

  const hover = hoverIndex !== null ? timeline[hoverIndex] : null;

  function handleMove(e: React.PointerEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setHoverIndex(Math.round(ratio * (timeline.length - 1)));
  }

  return (
    <div
      className="dca-chart"
      style={
        {
          "--series-value": COLOR_VALUE_LIGHT,
          "--series-contributed": COLOR_CONTRIBUTED_LIGHT,
        } as React.CSSProperties
      }
    >
      <style>{`
        .dca-chart { color-scheme: light; }
        @media (prefers-color-scheme: dark) {
          :root:where(:not([data-theme="light"])) .dca-chart {
            --series-value: ${COLOR_VALUE_DARK};
            --series-contributed: ${COLOR_CONTRIBUTED_DARK};
          }
        }
        :root[data-theme="dark"] .dca-chart {
          --series-value: ${COLOR_VALUE_DARK};
          --series-contributed: ${COLOR_CONTRIBUTED_DARK};
        }
      `}</style>
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label="Portfolio value vs. amount contributed over time"
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
              className="fill-panel-fg/40"
            >
              {currency(t)}
            </text>
          </g>
        ))}

        <path
          d={contributedPath}
          fill="none"
          stroke="var(--series-contributed)"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
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
            <circle
              cx={xForIndex(hoverIndex)}
              cy={yForValue(hover.contributed)}
              r={3.5}
              fill="var(--series-contributed)"
            />
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

      <div className="mt-1 flex flex-wrap items-center gap-4 text-[11px] text-panel-fg/60">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--series-value)" }} />
          Portfolio value
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--series-contributed)" }} />
          Total contributed
        </span>
        {hover && (
          <span className="ml-auto tabular-nums">
            {hover.date} &middot; value {currency(hover.value)} &middot; contributed {currency(hover.contributed)}
          </span>
        )}
      </div>
    </div>
  );
}
