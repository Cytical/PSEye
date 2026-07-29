/**
 * 52-week range as one compact visual instead of three separate number tiles.
 *
 * The hero previously spent three KPIs (high, low, "vs high") on this. A track
 * with the current price marked on it says the same thing in a third of the
 * width *and* answers the question those numbers only implied — where in its
 * own year-long range is this stock trading right now.
 *
 * Server-rendered, no client JS: the marker is a percentage offset, not a
 * measured DOM position.
 */
export function RangeBar({
  low,
  high,
  current,
  lowLabel,
  highLabel,
}: {
  low: number;
  high: number;
  current: number | null;
  lowLabel: string;
  highLabel: string;
}) {
  const span = high - low;
  // Clamped: a price can sit fractionally outside the window when the latest
  // quote is newer than the last close in the history series.
  const pos = current == null || span <= 0 ? null : Math.min(100, Math.max(0, ((current - low) / span) * 100));

  return (
    <div>
      <div className="relative h-1.5 rounded-full bg-panel-fg/12">
        {pos != null && (
          <>
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-panel-fg/25"
              style={{ width: `${pos}%` }}
            />
            <div
              className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent ring-2 ring-panel"
              style={{ left: `${pos}%` }}
            />
          </>
        )}
      </div>
      <div className="mt-1.5 flex items-baseline justify-between gap-2 text-[11px] tabular-nums text-panel-fg/72">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}
