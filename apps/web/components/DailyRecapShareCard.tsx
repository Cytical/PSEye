import { LogoMark } from "./LogoMark";
import { PseiTrendChart } from "./PseiTrendChart";
import type { DailyRecap, PseiHistoryPoint } from "@/lib/dailyRecap";

const UP = "var(--up)";
const DOWN = "var(--down)";
const MUTED = "var(--panel-fg)";

function MiniNewsList({ news }: { news: DailyRecap["news"] }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-[11px] font-medium uppercase tracking-wide text-panel-fg/55">In the News</p>
      <ul className="mt-1.5 flex flex-col gap-1.5">
        {news.map((n) => (
          <li key={n.url} className="text-[12px]">
            <a
              href={n.url}
              target="_blank"
              rel="noopener noreferrer"
              className="line-clamp-1 text-panel-fg/85 hover:underline"
            >
              {n.title}
            </a>
            <span className="ml-1.5 text-[10px] text-panel-fg/55">{n.source}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

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
 * Chart stacked below the PSEi value (not beside it) so the (much shorter)
 * value block doesn't leave dead space under itself once the chart sets the
 * card's height. The right column shows a text-only news list rather than
 * top movers — movers already get their own panels in the dashboard row
 * below, and news doesn't appear anywhere else on this page, so it's the one
 * thing worth surfacing here that isn't duplicated. A 7fr/3fr grid (not
 * flex-1 on both sides) fixes the split at 70/30 regardless of content —
 * flex-grow distributes only the *leftover* space evenly between the two
 * columns, so two different `basis` values don't actually produce a
 * predictable ratio; `fr` tracks split the row itself.
 */
export function DailyRecapShareCard({
  dateLabel,
  snapshot,
  breadth,
  pseiHistory,
  news,
}: {
  dateLabel: string;
  snapshot: DailyRecap["snapshot"];
  breadth: DailyRecap["breadth"];
  pseiHistory: PseiHistoryPoint[];
  news: DailyRecap["news"];
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
        <div className="mt-3 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-[7fr_3fr]">
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
            {pseiHistory.length > 1 && (
              <div className="mt-4">
                <PseiTrendChart history={pseiHistory} color={changeColor} />
              </div>
            )}
          </div>

          {news.length > 0 && (
            <div className="min-w-0">
              <MiniNewsList news={news} />
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
