import { LogoMark } from "./LogoMark";
import { PseiTrendChart } from "./PseiTrendChart";
import { MiniNewsThumb } from "./MiniNewsThumb";
import type { DailyRecap, PseiHistoryPoint } from "@/lib/dailyRecap";

const UP = "var(--up)";
const DOWN = "var(--down)";
const MUTED = "var(--panel-fg)";

/**
 * Image-first, not a text list — at 2 items there's room for each story to
 * actually show its picture rather than compete for a line of text, and a
 * photo reads faster than a headline in a glanceable/shareable card. The
 * image fills most of each card's height (aspect-[4/3], only a two-line
 * caption below it) rather than sitting beside the text as a small thumbnail.
 */
function MiniNewsCard({ item }: { item: DailyRecap["news"][number] }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group flex min-w-0 flex-1 flex-col overflow-hidden rounded-lg bg-panel ring-1 ring-panel-border"
    >
      <div className="aspect-[4/3] w-full overflow-hidden bg-panel-active">
        <MiniNewsThumb imageUrl={item.imageUrl} source={item.source} />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-2">
        <p className="line-clamp-2 text-[12px] font-medium leading-snug text-panel-fg group-hover:underline">
          {item.title}
        </p>
        <p className="mt-auto text-[10px] text-panel-fg/55">{item.source}</p>
      </div>
    </a>
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
 * card's height. The right column shows 2 image-led news cards rather than
 * top movers — movers already get their own panels in the dashboard row
 * below, and news doesn't appear anywhere else on this page, so it's the one
 * thing worth surfacing here that isn't duplicated.
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
        <div className="mt-3 flex flex-wrap gap-x-8 gap-y-4">
          <div className="min-w-0 flex-1 basis-[320px]">
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
            <div className="flex min-w-0 flex-1 basis-[260px] flex-col">
              <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-panel-fg/55">In the News</p>
              <div className="flex flex-1 gap-2">
                {news.map((n) => (
                  <MiniNewsCard key={n.url} item={n} />
                ))}
              </div>
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
