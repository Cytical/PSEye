import type { MarketSnapshot } from "@/lib/marketSnapshot";
import type { LatestForeignFlow } from "@/lib/latestForeignFlow";

interface MarketSummaryBarProps {
  snapshot: MarketSnapshot;
  foreignFlow: LatestForeignFlow;
}

function changeColor(n: number): string {
  return n >= 0 ? "text-[#30cc5a]" : "text-[#f6362f]";
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

/** Lives at the bottom of the market map's filter sidebar (see MarketMap.tsx), styled with the same panel-* vars so it matches whichever theme is active. */
export function MarketSummaryBar({ snapshot, foreignFlow }: MarketSummaryBarProps) {
  return (
    <div className="group relative cursor-default px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-panel-fg/35">PSEi</div>
      <div className="mt-1 text-2xl font-bold tracking-tight tabular-nums text-panel-fg">
        {snapshot.pseiValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      <div className={`text-xs font-semibold tabular-nums ${changeColor(snapshot.pseiChange)}`}>
        {snapshot.pseiChange >= 0 ? "+" : ""}
        {snapshot.pseiChange.toFixed(2)} ({snapshot.pseiPctChange >= 0 ? "+" : ""}
        {snapshot.pseiPctChange.toFixed(2)}%)
      </div>

      <div className="pointer-events-none absolute bottom-full left-3 z-10 mb-2 w-max max-w-[220px] rounded-lg border border-panel-border bg-panel-raised px-3 py-2 opacity-0 shadow-2xl transition-opacity duration-100 group-hover:opacity-100">
        <div className="text-[10px] font-semibold uppercase tracking-wide text-panel-fg/35">
          Foreign flow, week of {formatPeriodLabel(foreignFlow.periodEnd)}
        </div>
        <div className={`text-sm font-semibold tabular-nums ${changeColor(foreignFlow.netValue)}`}>
          {formatPeso(foreignFlow.netValue)} {foreignFlow.netValue >= 0 ? "net buying" : "net selling"}
        </div>
      </div>
    </div>
  );
}
