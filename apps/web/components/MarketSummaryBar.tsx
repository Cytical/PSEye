import Link from "next/link";
import type { MarketSnapshot } from "@/lib/marketSnapshot";
import type { LatestForeignFlow } from "@/lib/latestForeignFlow";
import type { MarketStatus } from "@/lib/marketStatus";
import { UpdatedAtStatus } from "./UpdatedAtStatus";

interface MarketSummaryBarProps {
  snapshot: MarketSnapshot;
  foreignFlow: LatestForeignFlow;
  /** Server's reading of market open/closed — see UpdatedAtStatus. */
  status: MarketStatus;
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

/** Lives at the top of the market map's filter sidebar (see MarketMap.tsx), styled with the same panel-* vars so it matches whichever theme is active. */
export function MarketSummaryBar({ snapshot, foreignFlow, status }: MarketSummaryBarProps) {
  return (
    <div className="cursor-default px-3 py-2">
      <div className="kicker text-panel-fg/72">PSEi</div>
      <div className="mt-1 text-2xl font-bold tracking-tight tabular-nums text-panel-fg">
        {snapshot.pseiValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      <div className={`text-xs font-semibold tabular-nums ${changeColor(snapshot.pseiChange)}`}>
        {snapshot.pseiChange >= 0 ? "+" : ""}
        {snapshot.pseiChange.toFixed(2)} ({snapshot.pseiPctChange >= 0 ? "+" : ""}
        {snapshot.pseiPctChange.toFixed(2)}%)
      </div>
      <UpdatedAtStatus
        capturedAt={snapshot.capturedAt}
        initialStatus={status}
        className="mt-0.5 block text-[10px] tabular-nums text-panel-fg/65"
      />

      {/* Foreign flow used to live in a hover-only tooltip floating above this
          block, which meant a number PSEye goes to the trouble of parsing out
          of a weekly PDF was invisible unless you happened to mouse over a
          price. It is a line of text; it can just be a line of text. */}
      <Link
        href="/foreign-flow"
        className="mt-2 block rounded-md border-t border-panel-border pt-2 transition-colors hover:bg-panel-raised"
      >
        <div className="kicker text-panel-fg/72">Foreign flow</div>
        <div className={`text-xs font-semibold tabular-nums ${changeColor(foreignFlow.netValue)}`}>
          {formatPeso(foreignFlow.netValue)} net {foreignFlow.netValue >= 0 ? "buying" : "selling"}
        </div>
        <div className="text-[10px] text-panel-fg/65">week of {formatPeriodLabel(foreignFlow.periodEnd)}</div>
      </Link>
    </div>
  );
}
