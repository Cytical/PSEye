"use client";

import { useMemo, useState } from "react";
import type { BenchmarkPoint } from "@/lib/portfolioBenchmark";

// Same two categorical slots DcaChart.tsx uses for its value/contributed pair
// — this is the same kind of relationship (your line vs. a reference line).
const COLOR_PORTFOLIO_LIGHT = "#2a78d6";
const COLOR_PORTFOLIO_DARK = "#3987e5";
const COLOR_BENCHMARK_LIGHT = "#1baf7a";
const COLOR_BENCHMARK_DARK = "#199e70";

const WIDTH = 720;
const HEIGHT = 260;
const PAD_LEFT = 56;
const PAD_RIGHT = 12;
const PAD_TOP = 16;
const PAD_BOTTOM = 12;

function pct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

/** Portfolio's cumulative % return vs. the PSEi equal-weighted proxy's, both
 * re-based to 0% at their first shared date (see alignPortfolioToBenchmark) —
 * "am I beating the market", not "what is my money worth" (that's
 * PortfolioHistoryChart's job). */
export function PortfolioBenchmarkChart({ points }: { points: BenchmarkPoint[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const { xForIndex, yForValue, plotWidth, plotHeight, yTicks } = useMemo(() => {
    const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
    const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
    const allValues = points.flatMap((p) => [p.portfolioReturnPct, p.benchmarkReturnPct]);
    const maxAbs = Math.max(...allValues.map(Math.abs), 1);
    const xForIndex = (i: number) => PAD_LEFT + (points.length <= 1 ? 0 : (i / (points.length - 1)) * plotWidth);
    const yForValue = (v: number) => PAD_TOP + plotHeight / 2 - (v / maxAbs) * (plotHeight / 2);
    const yTicks = [-1, -0.5, 0, 0.5, 1].map((t) => t * maxAbs);
    return { xForIndex, yForValue, plotWidth, plotHeight, yTicks };
  }, [points]);

  if (points.length === 0) return null;

  const portfolioPath = points.map((p, i) => `${i === 0 ? "M" : "L"}${xForIndex(i)},${yForValue(p.portfolioReturnPct)}`).join(" ");
  const benchmarkPath = points.map((p, i) => `${i === 0 ? "M" : "L"}${xForIndex(i)},${yForValue(p.benchmarkReturnPct)}`).join(" ");

  const hover = hoverIndex !== null ? points[hoverIndex] : null;

  function handleMove(e: React.PointerEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setHoverIndex(Math.round(ratio * (points.length - 1)));
  }

  return (
    <div
      className="portfolio-benchmark-chart"
      style={{ "--series-portfolio": COLOR_PORTFOLIO_LIGHT, "--series-benchmark": COLOR_BENCHMARK_LIGHT } as React.CSSProperties}
    >
      <style>{`
        .portfolio-benchmark-chart { color-scheme: light; }
        @media (prefers-color-scheme: dark) {
          :root:where(:not([data-theme="light"])) .portfolio-benchmark-chart {
            --series-portfolio: ${COLOR_PORTFOLIO_DARK};
            --series-benchmark: ${COLOR_BENCHMARK_DARK};
          }
        }
        :root[data-theme="dark"] .portfolio-benchmark-chart {
          --series-portfolio: ${COLOR_PORTFOLIO_DARK};
          --series-benchmark: ${COLOR_BENCHMARK_DARK};
        }
      `}</style>
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Your portfolio's return vs. the PSEi proxy">
        {yTicks.map((t) => (
          <g key={t}>
            <line
              x1={PAD_LEFT}
              x2={WIDTH - PAD_RIGHT}
              y1={yForValue(t)}
              y2={yForValue(t)}
              className={t === 0 ? "stroke-panel-fg/25" : "stroke-panel-fg/10"}
              strokeWidth={1}
            />
            <text x={PAD_LEFT - 8} y={yForValue(t)} textAnchor="end" dominantBaseline="middle" fontSize={10} className="fill-panel-fg/65">
              {pct(t)}
            </text>
          </g>
        ))}

        <path d={benchmarkPath} fill="none" stroke="var(--series-benchmark)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        <path d={portfolioPath} fill="none" stroke="var(--series-portfolio)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {hover && hoverIndex !== null && (
          <>
            <line x1={xForIndex(hoverIndex)} x2={xForIndex(hoverIndex)} y1={PAD_TOP} y2={HEIGHT - PAD_BOTTOM} className="stroke-panel-fg/30" strokeWidth={1} strokeDasharray="2,2" />
            <circle cx={xForIndex(hoverIndex)} cy={yForValue(hover.portfolioReturnPct)} r={3.5} fill="var(--series-portfolio)" />
            <circle cx={xForIndex(hoverIndex)} cy={yForValue(hover.benchmarkReturnPct)} r={3.5} fill="var(--series-benchmark)" />
          </>
        )}

        <rect x={PAD_LEFT} y={PAD_TOP} width={plotWidth} height={plotHeight} fill="transparent" onPointerMove={handleMove} onPointerLeave={() => setHoverIndex(null)} />
      </svg>

      <div className="mt-1 flex flex-wrap items-center gap-4 text-[11px] text-panel-fg/72">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--series-portfolio)" }} />
          Your portfolio
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--series-benchmark)" }} />
          PSEi proxy (equal-weighted)
        </span>
        {hover && (
          <span className="ml-auto tabular-nums">
            {hover.date} &middot; you {pct(hover.portfolioReturnPct)} &middot; PSEi {pct(hover.benchmarkReturnPct)}
          </span>
        )}
      </div>
    </div>
  );
}
