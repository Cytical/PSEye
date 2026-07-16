import type { MarketSnapshot } from "@/lib/marketSnapshot";
import type { LatestForeignFlow } from "@/lib/latestForeignFlow";

interface MarketSummaryBarProps {
  snapshot: MarketSnapshot;
  foreignFlow: LatestForeignFlow;
}

function changeColor(n: number): string {
  return n >= 0 ? "text-[#0ca30c] dark:text-[#30cc5a]" : "text-[#d03b3b] dark:text-[#f6362f]";
}

function formatPeso(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "+";
  if (abs >= 1_000_000_000) return `${sign}₱${(abs / 1_000_000_000).toFixed(2)}B`;
  return `${sign}₱${(abs / 1_000_000).toFixed(0)}M`;
}

function formatPeriodLabel(periodEnd: string): string {
  return new Date(`${periodEnd}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function MarketSummaryBar({ snapshot, foreignFlow }: MarketSummaryBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-8 gap-y-4 rounded-lg bg-black/[0.03] px-5 py-4 ring-1 ring-black/10 dark:bg-white/[0.04] dark:ring-white/10">
      <div className="group relative w-fit cursor-default">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-black/40 dark:text-white/40">
          PSEi
        </div>
        <div className="flex items-baseline gap-2.5">
          <span className="text-3xl font-bold tracking-tight tabular-nums">
            {snapshot.pseiValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
          <span className={`text-sm font-semibold tabular-nums ${changeColor(snapshot.pseiChange)}`}>
            {snapshot.pseiChange >= 0 ? "+" : ""}
            {snapshot.pseiChange.toFixed(2)} ({snapshot.pseiPctChange >= 0 ? "+" : ""}
            {snapshot.pseiPctChange.toFixed(2)}%)
          </span>
        </div>

        <div className="pointer-events-none absolute left-0 top-full z-10 mt-2 w-max max-w-xs rounded-lg border border-black/10 bg-white px-3 py-2 opacity-0 shadow-lg transition-opacity duration-100 group-hover:opacity-100 dark:border-white/10 dark:bg-[#12141a]">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-black/40 dark:text-white/40">
            Foreign flow, week of {formatPeriodLabel(foreignFlow.periodEnd)}
          </div>
          <div className={`text-sm font-semibold tabular-nums ${changeColor(foreignFlow.netValue)}`}>
            {formatPeso(foreignFlow.netValue)} {foreignFlow.netValue >= 0 ? "net buying" : "net selling"}
          </div>
        </div>
      </div>

      <div className="h-9 w-px bg-black/10 dark:bg-white/10" />

      <div>
        <div className="text-[10px] font-semibold uppercase tracking-wide text-black/40 dark:text-white/40">
          USD/PHP
        </div>
        <div className="text-lg font-semibold tabular-nums">₱{snapshot.usdPhpRate.toFixed(2)}</div>
      </div>
    </div>
  );
}
