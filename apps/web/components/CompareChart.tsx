"use client";

import { useMemo, useState } from "react";
import { normalizeCompareSeries, type CompareSeriesInput } from "@/lib/compareStocks";

export type CompareSeries = CompareSeriesInput;

/**
 * Categorical identity colors — deliberately not the green/red % change
 * scale used elsewhere (TreemapChart, DcaChart's own comment explains the
 * same reasoning): a single comparison line can go both up and down within
 * itself, so its color must mean "which stock," never "which direction."
 */
const SERIES_COLORS: { light: string; dark: string }[] = [
  { light: "#2a78d6", dark: "#3987e5" },
  { light: "#d6822a", dark: "#e59a39" },
  { light: "#8a5fc2", dark: "#a37fe0" },
  { light: "#5b7a99", dark: "#7fa0c2" },
];

const WIDTH = 720;
const HEIGHT = 320;
const PAD_LEFT = 56;
const PAD_RIGHT = 12;
const PAD_TOP = 16;
const PAD_BOTTOM = 12;

function formatPct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

export function CompareChart({ series }: { series: CompareSeries[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const normalized = useMemo(() => normalizeCompareSeries(series), [series]);

  const { xForIndex, yForPct, plotWidth, plotHeight, yTicks, dateCount } = useMemo(() => {
    const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
    const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
    const dateCount = normalized[0]?.points.length ?? 0;
    const allPct = normalized.flatMap((s) => s.points.map((p) => p.pct));
    const maxAbs = Math.max(...allPct.map(Math.abs), 1);
    const xForIndex = (i: number) => PAD_LEFT + (dateCount <= 1 ? 0 : (i / (dateCount - 1)) * plotWidth);
    const yForPct = (v: number) => PAD_TOP + plotHeight / 2 - (v / maxAbs) * (plotHeight / 2);
    const yTicks = [-maxAbs, -maxAbs / 2, 0, maxAbs / 2, maxAbs];
    return { xForIndex, yForPct, plotWidth, plotHeight, yTicks, dateCount };
  }, [normalized]);

  if (normalized.length === 0 || dateCount < 2) {
    return (
      <p className="text-sm text-black/50 dark:text-white/50">
        Not enough overlapping price history for this selection yet.
      </p>
    );
  }

  function handleMove(e: React.PointerEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setHoverIndex(Math.round(ratio * (dateCount - 1)));
  }

  const colorVars = Object.fromEntries(
    SERIES_COLORS.flatMap((c, i) => [
      [`--series-${i}-light`, c.light],
      [`--series-${i}-dark`, c.dark],
    ])
  ) as React.CSSProperties;

  return (
    <div className="compare-chart" style={colorVars}>
      <style>{`
        .compare-chart .series { color: var(--series-0-light); }
        ${SERIES_COLORS.map((_, i) => `.compare-chart .series-${i} { color: var(--series-${i}-light); }`).join("\n")}
        @media (prefers-color-scheme: dark) {
          :root:where(:not([data-theme="light"])) .compare-chart {
            ${SERIES_COLORS.map((_, i) => `--series-${i}-light: var(--series-${i}-dark);`).join("\n")}
          }
        }
        :root[data-theme="dark"] .compare-chart {
          ${SERIES_COLORS.map((_, i) => `--series-${i}-light: var(--series-${i}-dark);`).join("\n")}
        }
      `}</style>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Normalized % price change comparison">
        {yTicks.map((t, i) => (
          <g key={i}>
            <line
              x1={PAD_LEFT}
              x2={WIDTH - PAD_RIGHT}
              y1={yForPct(t)}
              y2={yForPct(t)}
              className={t === 0 ? "stroke-black/25 dark:stroke-white/25" : "stroke-black/10 dark:stroke-white/10"}
              strokeWidth={1}
            />
            <text x={PAD_LEFT - 8} y={yForPct(t)} textAnchor="end" dominantBaseline="middle" fontSize={10} className="fill-black/40 dark:fill-white/40">
              {formatPct(t)}
            </text>
          </g>
        ))}

        {normalized.map((s, i) => {
          const path = s.points.map((p, j) => `${j === 0 ? "M" : "L"}${xForIndex(j)},${yForPct(p.pct)}`).join(" ");
          return (
            <path
              key={s.ticker}
              d={path}
              fill="none"
              stroke={`var(--series-${i % SERIES_COLORS.length}-light)`}
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          );
        })}

        {hoverIndex !== null && (
          <line
            x1={xForIndex(hoverIndex)}
            x2={xForIndex(hoverIndex)}
            y1={PAD_TOP}
            y2={HEIGHT - PAD_BOTTOM}
            className="stroke-black/30 dark:stroke-white/30"
            strokeWidth={1}
            strokeDasharray="2,2"
          />
        )}
        {hoverIndex !== null &&
          normalized.map((s, i) => (
            <circle
              key={s.ticker}
              cx={xForIndex(hoverIndex)}
              cy={yForPct(s.points[hoverIndex].pct)}
              r={3.5}
              fill={`var(--series-${i % SERIES_COLORS.length}-light)`}
            />
          ))}

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

      <div className="mt-2 flex flex-wrap items-center gap-4 text-[11px] text-black/60 dark:text-white/60">
        {normalized.map((s, i) => (
          <span key={s.ticker} className="flex items-center gap-1.5">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: `var(--series-${i % SERIES_COLORS.length}-light)` }}
            />
            <span className="font-mono">{s.ticker}</span>
            {hoverIndex !== null && (
              <span className="tabular-nums">{formatPct(s.points[hoverIndex].pct)}</span>
            )}
          </span>
        ))}
        {hoverIndex !== null && (
          <span className="ml-auto tabular-nums">{normalized[0].points[hoverIndex].date}</span>
        )}
      </div>
    </div>
  );
}
