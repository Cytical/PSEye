import { LogoMark } from "./LogoMark";
import { PseiTrendChart } from "./PseiTrendChart";
import { Panel, MarketOverviewGrid, SectorMoversList } from "@/components/DailyRecapPanels";
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
 * Two-column on desktop: PSEi value with the trend chart stacked below it on
 * the left (~40-45%), Market Overview and Sector Movers stacked on the right
 * (~55-60%) — those two panels used to have their own full-width row further
 * down DailyRecapView, but that left the trend chart alone in a 100%-wide
 * column where, at a fixed 640:280 aspect ratio, it rendered 700px+ tall on
 * a wide desktop and dominated the page. Moving Market Overview/Sector
 * Movers up here both gives the chart a narrower column (so it scales down
 * proportionally) and fills the space that would otherwise sit empty next to
 * it. The right column renders independently of `snapshot` (a day can have
 * quotes without a snapshot row) so those two panels aren't lost when the
 * left column falls back to the no-snapshot placeholder text.
 */
export function DailyRecapShareCard({
  dateLabel,
  snapshot,
  breadth,
  pseiHistory,
  marketOverview,
  sectorMoves,
}: {
  dateLabel: string;
  snapshot: DailyRecap["snapshot"];
  breadth: DailyRecap["breadth"];
  pseiHistory: PseiHistoryPoint[];
  marketOverview: DailyRecap["marketOverview"];
  sectorMoves: DailyRecap["sectorMoves"];
}) {
  const changeColor = snapshot == null ? MUTED : snapshot.pseiPctChange >= 0 ? UP : DOWN;
  const hasRightColumn = marketOverview.totalMarketCap > 0 || sectorMoves.length > 0;

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

      <div className="mt-3 grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-[1fr_1.3fr]">
        <div className="min-w-0">
          {snapshot ? (
            <>
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
              {pseiHistory.length > 1 && (
                <div className="mt-4">
                  <PseiTrendChart history={pseiHistory} color={changeColor} />
                </div>
              )}
            </>
          ) : (
            <p className="text-base text-panel-fg/60">Full recap below: index move, top movers, foreign flow &amp; disclosures</p>
          )}
        </div>

        {hasRightColumn && (
          <div className="flex min-w-0 flex-col gap-3">
            {marketOverview.totalMarketCap > 0 && (
              <Panel title="Market Overview" size="full">
                <MarketOverviewGrid overview={marketOverview} />
              </Panel>
            )}
            {sectorMoves.length > 0 && (
              <Panel title="Sector Movers" moreHref="/sectors" size="full">
                <SectorMoversList sectors={sectorMoves} />
              </Panel>
            )}
          </div>
        )}
      </div>

      <p className="mt-2 text-[11px] text-panel-fg/55">pseye.vercel.app</p>
    </div>
  );
}
