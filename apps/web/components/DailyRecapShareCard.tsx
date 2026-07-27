import { LogoMark } from "./LogoMark";
import type { DailyRecap, PseiHistoryPoint } from "@/lib/dailyRecap";

const UP = "#3ddc84";
const DOWN = "#ff6b5e";
const MUTED = "#8b93a1";

const CHART_WIDTH = 240;
const CHART_HEIGHT = 56;
const PAD_X = 4;
const PAD_TOP = 16;
const PAD_BOTTOM = 16;
const SVG_WIDTH = CHART_WIDTH;
const SVG_HEIGHT = PAD_TOP + CHART_HEIGHT + PAD_BOTTOM;

function formatIndexValue(n: number): string {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatShortDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/** Trailing PSEi trend ending on this recap's date, styled like a
 * MarketWatch-style mini chart (gradient-filled area, high/low value
 * callouts, date range) — same fixed dark-palette reasoning as the rest of
 * this card, so it renders identically live or screenshotted regardless of
 * site theme. */
function PseiSparkline({ history, color }: { history: PseiHistoryPoint[]; color: string }) {
  const values = history.map((h) => h.pseiValue);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const minIndex = values.indexOf(min);
  const maxIndex = values.indexOf(max);
  const floorY = PAD_TOP + CHART_HEIGHT;

  const plotWidth = SVG_WIDTH - PAD_X * 2;
  const xFor = (i: number) => PAD_X + (i / (values.length - 1)) * plotWidth;
  const yFor = (v: number) => PAD_TOP + CHART_HEIGHT - ((v - min) / range) * CHART_HEIGHT;
  const clampX = (x: number) => Math.min(Math.max(x, PAD_X + 18), SVG_WIDTH - PAD_X - 18);

  const points = values.map((v, i) => `${xFor(i).toFixed(1)},${yFor(v).toFixed(1)}`).join(" ");
  const areaPoints = `${xFor(0).toFixed(1)},${floorY} ${points} ${xFor(values.length - 1).toFixed(1)},${floorY}`;
  const gradientId = "pseiSparkGradient";

  return (
    <svg
      width={SVG_WIDTH}
      height={SVG_HEIGHT}
      className="shrink-0"
      role="img"
      aria-label={`PSEi trend from ${history[0].date} to ${history[history.length - 1].date}, ranging from ${formatIndexValue(min)} to ${formatIndexValue(max)}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.28} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>

      <line x1={PAD_X} y1={floorY} x2={SVG_WIDTH - PAD_X} y2={floorY} stroke="#ffffff" strokeOpacity={0.08} />

      <polygon points={areaPoints} fill={`url(#${gradientId})`} stroke="none" />
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

      {maxIndex !== minIndex && (
        <text
          x={clampX(xFor(maxIndex))}
          y={Math.max(yFor(max) - 5, 9)}
          textAnchor="middle"
          className="font-mono"
          fontSize={9}
          fill="#ffffff"
          fillOpacity={0.55}
        >
          {formatIndexValue(max)}
        </text>
      )}
      <text
        x={clampX(xFor(minIndex))}
        y={Math.min(yFor(min) + 12, floorY - 2)}
        textAnchor="middle"
        className="font-mono"
        fontSize={9}
        fill="#ffffff"
        fillOpacity={0.55}
      >
        {formatIndexValue(min)}
      </text>

      {/* 0.55, not the 0.35 these started at: white at 35% over this card's
          fixed #0d0f14 measures 3.19:1, and at 9px these are the smallest type
          on the card. 0.55 matches the high/low callouts above at 6.22:1. */}
      <text x={PAD_X} y={SVG_HEIGHT - 3} textAnchor="start" fontSize={9} fill="#ffffff" fillOpacity={0.55}>
        {formatShortDate(history[0].date)}
      </text>
      <text x={SVG_WIDTH - PAD_X} y={SVG_HEIGHT - 3} textAnchor="end" fontSize={9} fill="#ffffff" fillOpacity={0.55}>
        {formatShortDate(history[history.length - 1].date)}
      </text>
    </svg>
  );
}

/**
 * Always renders in the same dark, on-brand palette regardless of site theme —
 * deliberately, so this card looks the same whether it's viewed live or
 * screenshotted and dropped into a tweet/chat, the same reasoning as the
 * opengraph-image.tsx share card it echoes (same colors/layout, just live DOM
 * instead of a satori-rendered PNG). Sits above the page's full detailed
 * sections so there's always a glanceable, shareable summary above the fold.
 */
export function DailyRecapShareCard({
  dateLabel,
  snapshot,
  breadth,
  pseiHistory,
}: {
  dateLabel: string;
  snapshot: DailyRecap["snapshot"];
  breadth: DailyRecap["breadth"];
  pseiHistory: PseiHistoryPoint[];
}) {
  const changeColor = snapshot == null ? MUTED : snapshot.pseiPctChange >= 0 ? UP : DOWN;

  return (
    <div className="rounded-2xl bg-[#0d0f14] p-5 shadow-lg shadow-black/20 ring-1 ring-white/10 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <LogoMark size={24} />
          <span className="text-base font-bold text-white">PSEye</span>
          <span className="text-xs text-white/50">PSE Daily Recap</span>
        </div>
        <span className="text-sm font-medium text-white/70">{dateLabel}</span>
      </div>

      {snapshot ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
            <span className="text-sm text-white/50">PSEi</span>
            <span className="text-4xl font-bold tabular-nums text-white sm:text-5xl">
              {snapshot.pseiValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-xl font-bold tabular-nums sm:text-2xl" style={{ color: changeColor }}>
              {snapshot.pseiPctChange >= 0 ? "+" : ""}
              {snapshot.pseiPctChange.toFixed(2)}%
            </span>
            {/* The /30 and /40 whites this card used measured 2.63:1 and
                3.77:1 against its fixed #0d0f14 — under AA, and this card is
                the first thing on the page and the one people screenshot.
                /55 (6.22:1) is the lightest tier that clears it. */}
            <span className="text-sm text-white/55">
              {snapshot.pseiChange >= 0 ? "+" : ""}
              {snapshot.pseiChange.toFixed(2)} pts
            </span>
          </div>
          {pseiHistory.length > 1 && <PseiSparkline history={pseiHistory} color={changeColor} />}
        </div>
      ) : (
        <p className="mt-5 text-lg text-white/60">Full recap below — index move, top movers, foreign flow &amp; disclosures</p>
      )}

      {breadth && (
        <div className="mt-3 text-sm">
          <span className="font-semibold tabular-nums" style={{ color: UP }}>
            {breadth.advancers}▲
          </span>
          <span className="mx-1.5 text-white/55">/</span>
          <span className="font-semibold tabular-nums" style={{ color: DOWN }}>
            {breadth.decliners}▼
          </span>
          <span className="ml-2 text-white/55">{breadth.unchanged} flat</span>
        </div>
      )}

      <p className="mt-5 text-[11px] text-white/55">pseye.vercel.app</p>
    </div>
  );
}
