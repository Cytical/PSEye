import { MockForeignFlowSource, type StockForeignFlow } from "@pseye/source-foreign-flow";
import { ForeignFlowChart } from "@/components/ForeignFlowChart";

export const revalidate = 86400;

function formatPeso(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}₱${(abs / 1_000_000_000).toFixed(2)}B`;
  return `${sign}₱${(abs / 1_000_000).toFixed(0)}M`;
}

export default async function ForeignFlowPage() {
  const source = new MockForeignFlowSource();
  const [indexFlow, { periodEnd, topBuying, topSelling }] = await Promise.all([
    source.getIndexFlow(),
    source.getTopStockFlows(),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold">Foreign Fund Flow</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Index-level foreign buying vs. selling by week, from PSE&apos;s Market Watch report.
        Weekly/monthly granularity only — true daily foreign flow requires a licensed feed.
      </p>

      <div className="mt-6">
        <ForeignFlowChart periods={indexFlow} />
        <div className="mt-1 flex items-center gap-4 text-[11px] text-black/60 dark:text-white/60">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-[#0ca30c]" />
            Net buying
          </span>
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-full bg-[#d03b3b]" />
            Net selling
          </span>
        </div>
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <FlowTable title="Top net foreign buying" rows={topBuying} tone="up" periodEnd={periodEnd} />
        <FlowTable title="Top net foreign selling" rows={topSelling} tone="down" periodEnd={periodEnd} />
      </div>

      <p className="mt-6 text-xs text-black/40 dark:text-white/40">
        Sample data — a real PDF-table-extraction pipeline for PSE&apos;s Market Watch report
        has not been wired in yet. Figures here are illustrative, not actual flows.
      </p>
    </div>
  );
}

function FlowTable({
  title,
  rows,
  tone,
  periodEnd,
}: {
  title: string;
  rows: StockForeignFlow[];
  tone: "up" | "down";
  periodEnd: string;
}) {
  const toneClass = tone === "up" ? "text-[#006300] dark:text-[#0ca30c]" : "text-[#d03b3b]";
  return (
    <div>
      <h2 className="text-sm font-medium">{title}</h2>
      <p className="text-[11px] text-black/40 dark:text-white/40">
        Week ending {new Date(periodEnd + "T00:00:00Z").toLocaleDateString("en-PH", { month: "short", day: "numeric", timeZone: "UTC" })}
      </p>
      <ol className="mt-2 flex flex-col gap-1.5 text-sm">
        {rows.map((r) => (
          <li key={r.ticker} className="flex items-center justify-between gap-2">
            <span>
              <span className="text-black/40 dark:text-white/40">{r.rank}.</span>{" "}
              <span className="font-mono text-xs">{r.ticker}</span> {r.companyName}
            </span>
            <span className={`shrink-0 tabular-nums ${toneClass}`}>{formatPeso(r.netValue)}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
