import type { MarketSnapshot } from "@/lib/marketSnapshot";
import type { LatestForeignFlow } from "@/lib/latestForeignFlow";
import { MarketSummaryBar } from "./MarketSummaryBar";
import { MarketMapLegend } from "./MarketMapLegend";

interface MarketMapFooterProps {
  snapshot: MarketSnapshot;
  foreignFlow: LatestForeignFlow;
}

/** PSEi (left) and the day-change legend (right) as one bar, spanning the full width of the map above it. */
export function MarketMapFooter({ snapshot, foreignFlow }: MarketMapFooterProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg bg-black/[0.03] px-5 py-4 ring-1 ring-black/10 dark:bg-white/[0.04] dark:ring-white/10">
      <MarketSummaryBar snapshot={snapshot} foreignFlow={foreignFlow} />
      <MarketMapLegend />
    </div>
  );
}
