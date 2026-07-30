"use client";

import { useMemo, useState } from "react";
import type { HistoricalClose } from "@pseye/source-quotes";

const WIDTH = 660;
const HEIGHT = 250;
const PAD_LEFT = 46;
const PAD_RIGHT = 12;
const PAD_TOP = 12;
const PAD_BOTTOM = 22;

/** Range presets, sliced client-side out of whatever the server already fetched
 * (up to STATS_LOOKBACK_DAYS/365 days — see apps/web/app/stocks/[ticker]/page.tsx),
 * so switching ranges is instant and needs no extra network request. */
const RANGES = [
  { key: "1M", days: 30 },
  { key: "3M", days: 90 },
  { key: "6M", days: 180 },
  { key: "1Y", days: 365 },
] as const;
type RangeKey = (typeof RANGES)[number]["key"];
const DEFAULT_RANGE: RangeKey = "3M";

function closesForRange(closes: HistoricalClose[], days: number): HistoricalClose[] {
  if (closes.length === 0) return closes;
  const cutoff = new Date(closes[closes.length - 1].date + "T00:00:00Z");
  cutoff.setUTCDate(cutoff.getUTCDate() - days);
  const cutoffIso = cutoff.toISOString().slice(0, 10);
  return closes.filter((c) => c.date >= cutoffIso);
}

/**
 * Interactive price line for the stock dashboard's single largest panel —
 * a range toggle (1M/3M/6M/1Y) slices the already-fetched year of closes
 * client-side, and a pointer-tracked crosshair (same pattern as DcaChart)
 * reads out the exact date/close on hover. Only ever called with real
 * DB-backed closes (see apps/web/app/stocks/[ticker]/page.tsx), never
 * MockHistoricalQuoteSource's synthetic walk — showing a fake chart on a
 * page framed as a real company's real data would undermine the one thing
 * this page is for.
 */
export function StockPriceChart({ closes: allCloses }: { closes: HistoricalClose[] }) {
  const [range, setRange] = useState<RangeKey>(DEFAULT_RANGE);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const rangeAvailability = useMemo(
    () => RANGES.map((r) => ({ key: r.key, count: closesForRange(allCloses, r.days).length })),
    [allCloses]
  );

  const closes = useMemo(() => {
    const days = RANGES.find((r) => r.key === range)!.days;
    const sliced = closesForRange(allCloses, days);
    // A range with too little data to draw (e.g. a recently-listed stock and
    // a 1M window) falls back to showing everything available rather than a
    // blank panel.
    return sliced.length >= 2 ? sliced : allCloses;
  }, [allCloses, range]);

  function selectRange(next: RangeKey) {
    setRange(next);
    setHoverIndex(null);
  }

  if (closes.length < 2) return null;

  const values = closes.map((c) => c.close);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range_ = max - min || 1;

  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const xFor = (i: number) => PAD_LEFT + (i / (closes.length - 1)) * plotWidth;
  const yFor = (v: number) => PAD_TOP + plotHeight - ((v - min) / range_) * plotHeight;

  const path = closes.map((c, i) => `${i === 0 ? "M" : "L"}${xFor(i)},${yFor(c.close)}`).join(" ");
  const trendsUp = values[values.length - 1] >= values[0];
  const stroke = trendsUp ? "var(--up)" : "var(--down)";
  // Closing the line path down to the baseline turns it into the fill region;
  // a separate <path> keeps the stroke itself from tracing the baseline.
  const area = `${path} L${xFor(closes.length - 1)},${PAD_TOP + plotHeight} L${PAD_LEFT},${PAD_TOP + plotHeight} Z`;
  // Unique per trend direction so the light/dark up-and-down variants can't
  // collide when two of these ever render on one page.
  const gradientId = `spc-fill-${trendsUp ? "up" : "down"}`;

  const yTicks = [min, min + range_ * 0.5, max];
  // First/middle/last only: a dense series has no room for more without the
  // labels colliding at this width.
  const xTickIdx = [0, Math.floor((closes.length - 1) / 2), closes.length - 1];

  const lastX = xFor(closes.length - 1);
  const lastY = yFor(values[values.length - 1]);

  const hovered = hoverIndex !== null ? closes[hoverIndex] : null;

  function handlePointerMove(e: React.PointerEvent<SVGRectElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setHoverIndex(Math.round(ratio * (closes.length - 1)));
  }

  return (
    <div className="flex w-full flex-col gap-1">
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex gap-1">
          {RANGES.map((r) => {
            const available = rangeAvailability.find((a) => a.key === r.key)?.count ?? 0;
            const disabled = available < 2 && r.key !== range;
            return (
              <button
                key={r.key}
                type="button"
                disabled={disabled}
                onClick={() => selectRange(r.key)}
                aria-pressed={range === r.key}
                className={`rounded px-1.5 py-0.5 text-[10.5px] font-medium transition-colors ${
                  range === r.key
                    ? "bg-panel-active text-panel-fg"
                    : disabled
                      ? "text-panel-fg/30"
                      : "text-panel-fg/60 hover:bg-panel-raised hover:text-panel-fg"
                }`}
              >
                {r.key}
              </button>
            );
          })}
        </div>
        <span className="text-right text-[10.5px] tabular-nums text-panel-fg/68">
          {hovered
            ? `${shortDate(hovered.date)} · ${hovered.close.toFixed(2)}`
            : `${shortDate(closes[0].date)} – ${shortDate(closes[closes.length - 1].date)}`}
        </span>
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        // `h-full` only from lg, where the dashboard row gives the panel a
        // definite height for it to resolve against. On mobile the row height
        // is dropped, so a percentage height would have no basis — width plus
        // the viewBox's own aspect ratio sizes it correctly there instead.
        className="w-full lg:h-full"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label={`Closing price trend from ${closes[0].date} to ${closes[closes.length - 1].date}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity={0.22} />
            <stop offset="100%" stopColor={stroke} stopOpacity={0} />
          </linearGradient>
        </defs>

        {yTicks.map((t) => (
          <g key={t}>
            <line
              x1={PAD_LEFT}
              x2={WIDTH - PAD_RIGHT}
              y1={yFor(t)}
              y2={yFor(t)}
              className="stroke-panel-fg/10"
              strokeWidth={1}
            />
            <text
              x={PAD_LEFT - 8}
              y={yFor(t)}
              textAnchor="end"
              dominantBaseline="middle"
              fontSize={10}
              className="fill-panel-fg/65"
            >
              {t.toFixed(2)}
            </text>
          </g>
        ))}

        <path d={area} fill={`url(#${gradientId})`} />
        <path d={path} fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {hoverIndex !== null && hovered ? (
          <>
            <line
              x1={xFor(hoverIndex)}
              x2={xFor(hoverIndex)}
              y1={PAD_TOP}
              y2={PAD_TOP + plotHeight}
              className="stroke-panel-fg/30"
              strokeWidth={1}
              strokeDasharray="2,2"
            />
            <circle cx={xFor(hoverIndex)} cy={yFor(hovered.close)} r={3.5} fill={stroke} />
          </>
        ) : (
          <circle cx={lastX} cy={lastY} r={3.5} fill={stroke} />
        )}

        {xTickIdx.map((idx, i) => (
          <text
            key={idx}
            x={xFor(idx)}
            y={HEIGHT - 6}
            textAnchor={i === 0 ? "start" : i === xTickIdx.length - 1 ? "end" : "middle"}
            fontSize={10}
            className="fill-panel-fg/65"
          >
            {shortDate(closes[idx].date)}
          </text>
        ))}

        {/* Pointer-tracking overlay — transparent, sits above everything else,
            spans just the plot area (matches DcaChart's own hover rect). */}
        <rect
          x={PAD_LEFT}
          y={PAD_TOP}
          width={plotWidth}
          height={plotHeight}
          fill="transparent"
          onPointerMove={handlePointerMove}
          onPointerLeave={() => setHoverIndex(null)}
        />
      </svg>
    </div>
  );
}

function shortDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
