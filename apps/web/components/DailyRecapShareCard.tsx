import { LogoMark } from "./LogoMark";
import { PseiTrendChart } from "./PseiTrendChart";
import type { DailyRecap, PseiHistoryPoint } from "@/lib/dailyRecap";

const UP = "var(--up)";
const DOWN = "var(--down)";
const MUTED = "var(--panel-fg)";

/**
 * Sits above the page's full detailed sections so there's always a
 * glanceable, shareable summary above the fold. Theme-aware (bg-panel-canvas
 * / text-panel-fg, same tokens the rest of the page uses) rather than the
 * fixed dark palette this used to have — that fixed-dark choice was meant to
 * keep screenshots consistent regardless of viewer theme (echoing
 * opengraph-image.tsx), but in practice it just meant the card looked broken
 * — permanently black — for anyone actually using light mode, which reads as
 * a bug, not a feature. A screenshot in light mode looking like light mode is
 * the more intuitive outcome anyway.
 *
 * News used to share this card with the PSEi value/chart in a 7fr/3fr grid,
 * but a 4-headline list is much shorter than the chart, which left a
 * permanent empty gap under the news column regardless of tuning. News now
 * lives in its own full dashboard panel below (see DailyRecapView.tsx) where
 * it has real room, and this card is single-column and full-width — nothing
 * else here is short enough to leave that same gap.
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
    <div className="rounded-2xl bg-[var(--panel-canvas)] p-4 shadow-sm shadow-black/5 ring-1 ring-panel-border sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <LogoMark size={20} />
          <span className="text-sm font-bold text-panel-fg">PSEye</span>
          <span className="text-xs text-panel-fg/50">Daily Recap</span>
        </div>
        <span className="text-xs font-medium text-panel-fg/70">{dateLabel}</span>
      </div>

      {snapshot ? (
        <div className="mt-3 grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2 lg:items-center">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
              <span className="text-xs text-panel-fg/50">PSEi</span>
              <span className="text-4xl font-bold tabular-nums text-panel-fg sm:text-5xl">
                {snapshot.pseiValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <span className="text-xl font-bold tabular-nums sm:text-2xl" style={{ color: changeColor }}>
                {snapshot.pseiPctChange >= 0 ? "+" : ""}
                {snapshot.pseiPctChange.toFixed(2)}%
              </span>
              <span className="text-sm text-panel-fg/55">
                {snapshot.pseiChange >= 0 ? "+" : ""}
                {snapshot.pseiChange.toFixed(2)} pts
              </span>
              {breadth && (
                <span className="text-xs">
                  <span className="font-semibold tabular-nums" style={{ color: UP }}>
                    {breadth.advancers}▲
                  </span>
                  <span className="mx-1 text-panel-fg/55">/</span>
                  <span className="font-semibold tabular-nums" style={{ color: DOWN }}>
                    {breadth.decliners}▼
                  </span>
                  <span className="ml-1.5 text-panel-fg/55">{breadth.unchanged} flat</span>
                </span>
              )}
            </div>
          </div>
          {/* Capped to this grid column (roughly half the card on desktop,
              not the old full-card width) so the chart reads as a supporting
              visual next to the headline number rather than dominating the
              page — a 640:280 viewBox at ~half the previous rendered width
              also renders proportionally half as tall. */}
          {pseiHistory.length > 1 && (
            <div className="min-w-0">
              <PseiTrendChart history={pseiHistory} color={changeColor} />
            </div>
          )}
        </div>
      ) : (
        <p className="mt-3 text-base text-panel-fg/60">Full recap below — index move, top movers, foreign flow &amp; disclosures</p>
      )}

      <p className="mt-2 text-[11px] text-panel-fg/55">pseye.vercel.app</p>
    </div>
  );
}
