import type { Metadata } from "next";
import { MockForeignFlowSource, type IndexForeignFlow, type StockForeignFlow } from "@pseye/source-foreign-flow";
import { ForeignFlowChart } from "@/components/ForeignFlowChart";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Foreign Fund Flow",
  description: "Weekly index-level and per-stock net foreign buying/selling on the PSE.",
};

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

        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-xs text-black/50 hover:text-black/70 dark:text-white/50 dark:hover:text-white/70">
            Show as table
          </summary>
          <IndexFlowTable periods={indexFlow} />
        </details>
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

function IndexFlowTable({ periods }: { periods: IndexForeignFlow[] }) {
  return (
    <table className="mt-2 w-full text-xs">
      <thead>
        <tr className="border-b border-black/10 text-left text-black/50 dark:border-white/10 dark:text-white/50">
          <th className="py-1.5 pr-4 font-medium">Week ending</th>
          <th className="py-1.5 pr-4 text-right font-medium">Foreign buy</th>
          <th className="py-1.5 pr-4 text-right font-medium">Foreign sell</th>
          <th className="py-1.5 text-right font-medium">Net</th>
        </tr>
      </thead>
      <tbody>
        {periods.map((p) => (
          <tr key={p.periodEnd} className="border-b border-black/5 dark:border-white/5">
            <td className="py-1.5 pr-4">
              {new Date(p.periodEnd + "T00:00:00Z").toLocaleDateString("en-PH", {
                month: "short",
                day: "numeric",
                timeZone: "UTC",
              })}
            </td>
            <td className="py-1.5 pr-4 text-right tabular-nums">{formatPeso(p.foreignBuyValue)}</td>
            <td className="py-1.5 pr-4 text-right tabular-nums">{formatPeso(p.foreignSellValue)}</td>
            <td
              className={`py-1.5 text-right font-medium tabular-nums ${p.netValue >= 0 ? "text-[#006300] dark:text-[#0ca30c]" : "text-[#d03b3b]"}`}
            >
              {formatPeso(p.netValue)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
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
