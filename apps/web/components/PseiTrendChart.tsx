"use client";

import { useMemo, useRef, useState } from "react";
import type { PseiHistoryPoint } from "@/lib/dailyRecap";

// Internal SVG coordinate system — actual rendered size is controlled by the
// wrapping element's CSS (className="w-full" below), same viewBox-scales
// pattern as DcaChart.tsx, not a fixed pixel size.
const WIDTH = 640;
const HEIGHT = 220;
const PAD_LEFT = 8;
const PAD_RIGHT = 8;
const PAD_TOP = 20;
const PAD_BOTTOM = 26;
const Y_TICK_COUNT = 4;
const X_LABEL_COUNT = 5;
// A drag shorter than this (in real rendered pixels, not viewBox units) is
// treated as a click/tap rather than a zoom-range selection.
const DRAG_THRESHOLD_PX = 6;

function formatIndexValue(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatShortDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/**
 * Trailing PSEi trend, replacing the old fixed-size PseiSparkline with a
 * proper line chart: y-axis gridlines/values, x-axis date labels, a hover
 * readout, and drag-to-zoom (drag a range on the chart to zoom into it,
 * double-click or the "Reset zoom" button to zoom back out — zooming again
 * while already zoomed narrows further rather than resetting first, so you
 * can drill down in more than one step). Client component (the rest of
 * DailyRecapShareCard stays a server component) since zoom/hover state and
 * pointer events need the browser. Colors follow the card's theme-aware
 * `--panel-fg`/`--panel-canvas` tokens rather than a fixed dark palette, so
 * this matches whichever theme the visitor — or a screenshot taken in that
 * theme — is actually in.
 */
export function PseiTrendChart({ history, color }: { history: PseiHistoryPoint[]; color: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [zoomRange, setZoomRange] = useState<[number, number] | null>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [dragStartX, setDragStartX] = useState<number | null>(null);
  const [dragCurrentX, setDragCurrentX] = useState<number | null>(null);
  const dragStartClientX = useRef<number | null>(null);

  const [startIdx, endIdx] = zoomRange ?? [0, history.length - 1];
  const visible = useMemo(() => history.slice(startIdx, endIdx + 1), [history, startIdx, endIdx]);

  const { xFor, yFor, plotWidth, floorY, minV, maxV } = useMemo(() => {
    const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
    const floorY = HEIGHT - PAD_BOTTOM;
    const values = visible.map((h) => h.pseiValue);
    const minV = values.length ? Math.min(...values) : 0;
    const maxV = values.length ? Math.max(...values) : 1;
    const range = maxV - minV || 1;
    const xFor = (i: number) =>
      PAD_LEFT + (visible.length <= 1 ? plotWidth / 2 : (i / (visible.length - 1)) * plotWidth);
    const yFor = (v: number) => PAD_TOP + (floorY - PAD_TOP) * (1 - (v - minV) / range);
    return { xFor, yFor, plotWidth, floorY, minV, maxV };
  }, [visible]);

  if (history.length < 2 || visible.length < 2) return null;

  const points = visible.map((h, i) => `${xFor(i).toFixed(1)},${yFor(h.pseiValue).toFixed(1)}`).join(" ");
  const areaPoints = `${xFor(0).toFixed(1)},${floorY} ${points} ${xFor(visible.length - 1).toFixed(1)},${floorY}`;

  const yTicks = Array.from({ length: Y_TICK_COUNT + 1 }, (_, i) => minV + ((maxV - minV) * i) / Y_TICK_COUNT);

  const labelSlots = Math.min(X_LABEL_COUNT, visible.length);
  const labelIndices = Array.from(new Set(
    Array.from({ length: labelSlots }, (_, i) => Math.round((i / (labelSlots - 1 || 1)) * (visible.length - 1)))
  ));

  function viewBoxXFromClientX(clientX: number): number {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const ratio = Math.min(1, Math.max(0, (clientX - rect.left) / rect.width));
    return ratio * WIDTH;
  }

  function indexFromViewBoxX(vx: number): number {
    const ratio = Math.min(1, Math.max(0, (vx - PAD_LEFT) / plotWidth));
    return Math.round(ratio * (visible.length - 1));
  }

  function handlePointerDown(e: React.PointerEvent<SVGRectElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStartClientX.current = e.clientX;
    const vx = viewBoxXFromClientX(e.clientX);
    setDragStartX(vx);
    setDragCurrentX(vx);
  }

  function handlePointerMove(e: React.PointerEvent<SVGRectElement>) {
    const vx = viewBoxXFromClientX(e.clientX);
    if (dragStartX !== null) setDragCurrentX(vx);
    setHoverIndex(indexFromViewBoxX(vx));
  }

  function handlePointerUp(e: React.PointerEvent<SVGRectElement>) {
    const startClientX = dragStartClientX.current;
    dragStartClientX.current = null;

    // Uses e.clientX (this event's own position) rather than the dragCurrentX
    // state for the end point — dragCurrentX only updates on pointermove, and
    // a fast/synthetic drag (e.g. touch, or automation) can fire pointerdown
    // and pointerup without a pointermove landing in between, which would
    // otherwise leave dragCurrentX stuck at the start position and silently
    // never commit a zoom.
    if (dragStartX !== null && startClientX !== null) {
      const draggedPx = Math.abs(e.clientX - startClientX);
      if (draggedPx > DRAG_THRESHOLD_PX) {
        const endVx = viewBoxXFromClientX(e.clientX);
        const iLo = indexFromViewBoxX(Math.min(dragStartX, endVx));
        const iHi = indexFromViewBoxX(Math.max(dragStartX, endVx));
        if (iHi > iLo) setZoomRange([startIdx + iLo, startIdx + iHi]);
      }
    }
    setDragStartX(null);
    setDragCurrentX(null);
  }

  function resetZoom() {
    setZoomRange(null);
    setHoverIndex(null);
  }

  const isZoomed = zoomRange !== null;
  const hover = hoverIndex !== null ? visible[hoverIndex] : null;
  const selection =
    dragStartX !== null && dragCurrentX !== null && Math.abs(dragCurrentX - dragStartX) > 1
      ? { x: Math.min(dragStartX, dragCurrentX), width: Math.abs(dragCurrentX - dragStartX) }
      : null;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-medium uppercase tracking-wide text-panel-fg/55">PSEi trend</span>
        {isZoomed && (
          <button
            type="button"
            onClick={resetZoom}
            className="text-[11px] font-medium text-panel-fg/55 underline decoration-dotted underline-offset-2 hover:text-panel-fg/80"
          >
            Reset zoom
          </button>
        )}
      </div>

      <svg
        ref={svgRef}
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="mt-1 w-full touch-none select-none"
        role="img"
        aria-label={`PSEi trend from ${visible[0].date} to ${visible[visible.length - 1].date}, ranging from ${formatIndexValue(minV)} to ${formatIndexValue(maxV)}. Drag to zoom.`}
        onDoubleClick={resetZoom}
      >
        <defs>
          <linearGradient id="pseiTrendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.25} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>

        {yTicks.map((t) => (
          <g key={t}>
            <line
              x1={PAD_LEFT}
              x2={WIDTH - PAD_RIGHT}
              y1={yFor(t)}
              y2={yFor(t)}
              stroke="var(--panel-fg)"
              strokeOpacity={0.08}
            />
            <text
              x={WIDTH - PAD_RIGHT}
              y={yFor(t) - 3}
              textAnchor="end"
              fontSize={9}
              fill="var(--panel-fg)"
              fillOpacity={0.55}
              className="font-mono"
            >
              {formatIndexValue(t)}
            </text>
          </g>
        ))}

        <polygon points={areaPoints} fill="url(#pseiTrendGradient)" stroke="none" />
        <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {labelIndices.map((i) => (
          <text key={i} x={xFor(i)} y={HEIGHT - 8} textAnchor="middle" fontSize={9} fill="var(--panel-fg)" fillOpacity={0.55}>
            {formatShortDate(visible[i].date)}
          </text>
        ))}

        {hover && hoverIndex !== null && !selection && (
          <>
            <line
              x1={xFor(hoverIndex)}
              x2={xFor(hoverIndex)}
              y1={PAD_TOP}
              y2={floorY}
              stroke="var(--panel-fg)"
              strokeOpacity={0.25}
              strokeDasharray="2,2"
            />
            <circle
              cx={xFor(hoverIndex)}
              cy={yFor(hover.pseiValue)}
              r={3.5}
              fill={color}
              stroke="var(--panel-canvas)"
              strokeWidth={1.5}
            />
          </>
        )}

        {selection && (
          <rect
            x={selection.x}
            y={PAD_TOP}
            width={selection.width}
            height={floorY - PAD_TOP}
            fill="var(--panel-fg)"
            fillOpacity={0.12}
          />
        )}

        <rect
          x={PAD_LEFT}
          y={PAD_TOP}
          width={plotWidth}
          height={floorY - PAD_TOP}
          fill="transparent"
          className="cursor-crosshair"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={() => setHoverIndex(null)}
        />
      </svg>

      <p className="mt-1 text-[10px] text-panel-fg/55">
        {hover
          ? `${formatShortDate(hover.date)} · ${formatIndexValue(hover.pseiValue)}`
          : "Drag to zoom · double-click to reset"}
      </p>
    </div>
  );
}
