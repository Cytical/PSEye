"use client";

import { useState } from "react";
import type { IndexForeignFlow } from "@pseye/source-foreign-flow";

// Same finance-convention green/red diverging pair as TreemapChart's color.ts
// (green=net buying, red=net selling) — this is a polarity metric too.
const POLE_UP = "#0ca30c";
const POLE_UP_DARK = "#0ca30c";
const POLE_DOWN = "#d03b3b";
const POLE_DOWN_DARK = "#e66767";

const WIDTH = 720;
const HEIGHT = 260;
const PAD_LEFT = 70;
const PAD_RIGHT = 12;
const PAD_TOP = 12;
const PAD_BOTTOM = 24;

function formatPeso(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}₱${(abs / 1_000_000_000).toFixed(2)}B`;
  return `${sign}₱${(abs / 1_000_000).toFixed(0)}M`;
}

function formatWeek(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function ForeignFlowChart({ periods }: { periods: IndexForeignFlow[] }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const maxAbs = Math.max(...periods.map((p) => Math.abs(p.netValue)), 1);
  const zeroY = PAD_TOP + plotHeight / 2;
  const barWidth = Math.min(36, (plotWidth / periods.length) * 0.6);

  const xForIndex = (i: number) =>
    PAD_LEFT + ((i + 0.5) / periods.length) * plotWidth;
  const heightForValue = (v: number) => (Math.abs(v) / maxAbs) * (plotHeight / 2);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Weekly net foreign fund flow">
        <line x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT} y1={zeroY} y2={zeroY} className="stroke-panel-fg/20" strokeWidth={1} />
        <text x={PAD_LEFT - 8} y={zeroY} textAnchor="end" dominantBaseline="middle" fontSize={10} className="fill-panel-fg/40">
          ₱0
        </text>

        {periods.map((p, i) => {
          const x = xForIndex(i) - barWidth / 2;
          const h = heightForValue(p.netValue);
          const isPositive = p.netValue >= 0;
          const y = isPositive ? zeroY - h : zeroY;
          return (
            <g key={p.periodEnd} onMouseEnter={() => setHoverIndex(i)} onMouseLeave={() => setHoverIndex(null)}>
              <rect x={x} y={y} width={barWidth} height={Math.max(h, 1)} rx={2} className="dark:hidden" fill={isPositive ? POLE_UP : POLE_DOWN} opacity={hoverIndex === null || hoverIndex === i ? 1 : 0.4} />
              <rect x={x} y={y} width={barWidth} height={Math.max(h, 1)} rx={2} className="hidden dark:block" fill={isPositive ? POLE_UP_DARK : POLE_DOWN_DARK} opacity={hoverIndex === null || hoverIndex === i ? 1 : 0.4} />
              <rect x={x} y={PAD_TOP} width={barWidth} height={plotHeight} fill="transparent" />
            </g>
          );
        })}

        {periods.map((p, i) =>
          i % 2 === 0 ? (
            <text key={p.periodEnd} x={xForIndex(i)} y={HEIGHT - 6} textAnchor="middle" fontSize={9} className="fill-panel-fg/40">
              {formatWeek(p.periodEnd)}
            </text>
          ) : null
        )}
      </svg>

      {hoverIndex !== null && (
        <div
          className="pointer-events-none absolute rounded-md border border-panel-border bg-panel/95 px-2 py-1 text-xs text-panel-fg shadow-sm backdrop-blur-sm"
          style={{
            left: `${(xForIndex(hoverIndex) / WIDTH) * 100}%`,
            top: 4,
            transform: "translateX(-50%)",
          }}
        >
          <div className="font-medium">{formatWeek(periods[hoverIndex].periodEnd)}</div>
          <div className={periods[hoverIndex].netValue >= 0 ? "text-[#006300] dark:text-[#0ca30c]" : "text-[#d03b3b]"}>
            Net {periods[hoverIndex].netValue >= 0 ? "buying" : "selling"}: {formatPeso(periods[hoverIndex].netValue)}
          </div>
        </div>
      )}
    </div>
  );
}
