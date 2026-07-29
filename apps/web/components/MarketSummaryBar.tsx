import type { MarketSnapshot } from "@/lib/marketSnapshot";
import type { LatestForeignFlow } from "@/lib/latestForeignFlow";

interface MarketSummaryBarProps {
  snapshot: MarketSnapshot;
  foreignFlow: LatestForeignFlow;
}

export function changeColor(n: number): string {
  return n >= 0 ? "text-up" : "text-down";
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

// Fixed to Asia/Manila rather than the visitor's local timezone — otherwise
// the server (UTC) and a client browser in a different zone would format the
// same instant differently and trip a hydration mismatch, same reasoning as
// formatPickerDate's fixed UTC above. Exported so SiteFooter's own "last
// updated" line (bottom-right of every page) reads identically to this one.
export function formatUpdatedAt(capturedAt: string): string {
  return new Date(capturedAt).toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  });
}

/** Lives at the bottom of the market map's filter sidebar (see MarketMap.tsx), styled with the same panel-* vars so it matches whichever theme is active. */
export function MarketSummaryBar({ snapshot, foreignFlow }: MarketSummaryBarProps) {
  return (
    <div className="group relative cursor-default px-3 py-2">
      <div className="kicker text-panel-fg/72">PSEi</div>
      <div className="mt-1 text-2xl font-bold tracking-tight tabular-nums text-panel-fg">
        {snapshot.pseiValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      <div className={`text-xs font-semibold tabular-nums ${changeColor(snapshot.pseiChange)}`}>
        {snapshot.pseiChange >= 0 ? "+" : ""}
        {snapshot.pseiChange.toFixed(2)} ({snapshot.pseiPctChange >= 0 ? "+" : ""}
        {snapshot.pseiPctChange.toFixed(2)}%)
      </div>
      <div className="mt-0.5 text-[10px] tabular-nums text-panel-fg/65">
        Updated {formatUpdatedAt(snapshot.capturedAt)} PHT
      </div>

      <div className="pointer-events-none absolute bottom-full left-3 z-10 mb-2 w-max max-w-[220px] rounded-xl border border-panel-border bg-panel-raised px-3 py-2 opacity-0 shadow-xl shadow-black/20 transition-opacity duration-100 group-hover:opacity-100">
        <div className="kicker text-panel-fg/72">
          Foreign flow, week of {formatPeriodLabel(foreignFlow.periodEnd)}
        </div>
        <div className={`text-sm font-semibold tabular-nums ${changeColor(foreignFlow.netValue)}`}>
          {formatPeso(foreignFlow.netValue)} {foreignFlow.netValue >= 0 ? "net buying" : "net selling"}
        </div>
      </div>
    </div>
  );
}
