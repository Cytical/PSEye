import Link from "next/link";
import { LogoMark } from "./LogoMark";
import { PseiTrendChart } from "./PseiTrendChart";
import type { DailyRecap, PseiHistoryPoint } from "@/lib/dailyRecap";

const UP = "#3ddc84";
const DOWN = "#ff6b5e";
const MUTED = "#8b93a1";

function MiniMoverList({ title, movers, color }: { title: string; movers: DailyRecap["gainers"]; color: string }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-[11px] font-medium uppercase tracking-wide text-white/55">{title}</p>
      <ul className="mt-1.5 flex flex-col gap-1">
        {movers.map((m) => (
          <li key={m.ticker} className="flex items-baseline justify-between gap-2 text-[12px]">
            <Link href={`/stocks/${m.ticker}`} className="min-w-0 truncate font-mono text-[11px] font-semibold text-white hover:underline">
              {m.ticker}
            </Link>
            <span className="shrink-0 font-medium tabular-nums" style={{ color }}>
              {m.pctChange >= 0 ? "+" : ""}
              {m.pctChange.toFixed(2)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Always renders in the same dark, on-brand palette regardless of site theme —
 * deliberately, so this card looks the same whether it's viewed live or
 * screenshotted and dropped into a tweet/chat, the same reasoning as the
 * opengraph-image.tsx share card it echoes (same colors/layout, just live DOM
 * instead of a satori-rendered PNG). Sits above the page's full detailed
 * sections so there's always a glanceable, shareable summary above the fold.
 *
 * Chart stacked below the PSEi value (not beside it) and gainers/losers
 * pulled in from the page's own dashboard row to sit to the right — the old
 * side-by-side PSEi/chart split left a lot of dead space under the (much
 * shorter) value block once the chart's column set the card's height.
 * Ticker-only rows here (no company name, unlike the full MoverList this
 * replaced) — this card is the glanceable/shareable summary, not the detail
 * view, and every ticker still links through to its stock page.
 */
export function DailyRecapShareCard({
  dateLabel,
  snapshot,
  breadth,
  pseiHistory,
  gainers,
  losers,
}: {
  dateLabel: string;
  snapshot: DailyRecap["snapshot"];
  breadth: DailyRecap["breadth"];
  pseiHistory: PseiHistoryPoint[];
  gainers: DailyRecap["gainers"];
  losers: DailyRecap["losers"];
}) {
  const changeColor = snapshot == null ? MUTED : snapshot.pseiPctChange >= 0 ? UP : DOWN;

  return (
    <div className="rounded-2xl bg-[#0d0f14] p-4 shadow-lg shadow-black/20 ring-1 ring-white/10 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <LogoMark size={20} />
          <span className="text-sm font-bold text-white">PSEye</span>
          <span className="text-xs text-white/50">Daily Recap</span>
        </div>
        <span className="text-xs font-medium text-white/70">{dateLabel}</span>
      </div>

      {snapshot ? (
        <div className="mt-3 flex flex-wrap gap-x-8 gap-y-4">
          <div className="min-w-0 flex-1 basis-[320px]">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
              <span className="text-xs text-white/50">PSEi</span>
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
              {breadth && (
                <span className="text-xs">
                  <span className="font-semibold tabular-nums" style={{ color: UP }}>
                    {breadth.advancers}▲
                  </span>
                  <span className="mx-1 text-white/55">/</span>
                  <span className="font-semibold tabular-nums" style={{ color: DOWN }}>
                    {breadth.decliners}▼
                  </span>
                  <span className="ml-1.5 text-white/55">{breadth.unchanged} flat</span>
                </span>
              )}
            </div>
            {pseiHistory.length > 1 && (
              <div className="mt-4">
                <PseiTrendChart history={pseiHistory} color={changeColor} />
              </div>
            )}
          </div>

          {(gainers.length > 0 || losers.length > 0) && (
            <div className="flex min-w-0 flex-1 basis-[220px] gap-5">
              {gainers.length > 0 && <MiniMoverList title="Top Gainers" movers={gainers} color={UP} />}
              {losers.length > 0 && <MiniMoverList title="Top Losers" movers={losers} color={DOWN} />}
            </div>
          )}
        </div>
      ) : (
        <p className="mt-3 text-base text-white/60">Full recap below — index move, top movers, foreign flow &amp; disclosures</p>
      )}

      <p className="mt-2 text-[11px] text-white/55">pseye.vercel.app</p>
    </div>
  );
}
