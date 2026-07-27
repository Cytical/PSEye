import { LogoMark } from "./LogoMark";
import type { DailyRecap, PseiHistoryPoint } from "@/lib/dailyRecap";

const UP = "#3ddc84";
const DOWN = "#ff6b5e";
const MUTED = "#8b93a1";

const SPARK_WIDTH = 120;
const SPARK_HEIGHT = 44;

/** Trailing PSEi trend ending on this recap's date — same fixed dark-palette
 * reasoning as the rest of this card, so it renders identically live or
 * screenshotted regardless of site theme. */
function PseiSparkline({ history, color }: { history: PseiHistoryPoint[]; color: string }) {
  const values = history.map((h) => h.pseiValue);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * SPARK_WIDTH;
      const y = SPARK_HEIGHT - ((v - min) / range) * SPARK_HEIGHT;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg
      width={SPARK_WIDTH}
      height={SPARK_HEIGHT}
      className="shrink-0"
      role="img"
      aria-label={`PSEi trend from ${history[0].date} to ${history[history.length - 1].date}`}
    >
      <polyline points={points} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
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
            <span className="text-sm text-white/40">
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
          <span className="mx-1.5 text-white/30">/</span>
          <span className="font-semibold tabular-nums" style={{ color: DOWN }}>
            {breadth.decliners}▼
          </span>
          <span className="ml-2 text-white/40">{breadth.unchanged} flat</span>
        </div>
      )}

      <p className="mt-5 text-[11px] text-white/30">pseye.vercel.app</p>
    </div>
  );
}
