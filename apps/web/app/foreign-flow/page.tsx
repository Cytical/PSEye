import type { Metadata } from "next";
import Link from "next/link";
import type { IndexForeignFlow, StockForeignFlow } from "@pseye/source-foreign-flow";
import { ForeignFlowChart } from "@/components/ForeignFlowChart";
import { getForeignFlowPageData } from "@/lib/foreignFlow";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "PSE Foreign Buying & Selling — Net Fund Flow",
  description: "Weekly index-level and daily per-stock net foreign buying/selling on the PSE.",
  alternates: { canonical: "/foreign-flow" },
};

function formatPeso(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}₱${(abs / 1_000_000_000).toFixed(2)}B`;
  return `${sign}₱${(abs / 1_000_000).toFixed(0)}M`;
}

export default async function ForeignFlowPage() {
  const { indexFlow, periodEnd, topBuying, topSelling, stockFlowSource } = await getForeignFlowPageData();

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-panel-fg">Foreign Fund Flow</h1>
      <p className="mt-1.5 text-sm text-panel-fg/60">
        Index-level foreign buying vs. selling by week, from PSE&apos;s Market Watch report, plus
        daily per-stock net foreign buying/selling from PSE&apos;s Daily Quotation Report.
      </p>

      <div className="mt-8 rounded-lg bg-panel p-4 ring-1 ring-panel-border">
        {indexFlow.length > 0 ? (
          <>
            <ForeignFlowChart periods={indexFlow} />
            <div className="mt-1 flex items-center gap-4 text-[11px] text-panel-fg/60">
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
              <summary className="cursor-pointer text-xs text-panel-fg/50 hover:text-panel-fg/80">
                Show as table
              </summary>
              <IndexFlowTable periods={indexFlow} />
            </details>
          </>
        ) : (
          <p className="text-sm text-panel-fg/50">No index-level foreign flow on record yet.</p>
        )}
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <FlowTable title="Top net foreign buying" rows={topBuying} tone="up" periodEnd={periodEnd} />
        <FlowTable title="Top net foreign selling" rows={topSelling} tone="down" periodEnd={periodEnd} />
      </div>

      <p className="mt-6 text-xs text-panel-fg/60">
        {stockFlowSource === "real"
          ? "Per-stock rankings are real daily net foreign buying/selling figures from PSE's Daily Quotation Report."
          : "Per-stock rankings above are sample data — the real daily source hasn't populated any rows yet."}
      </p>
    </div>
  );
}

function IndexFlowTable({ periods }: { periods: IndexForeignFlow[] }) {
  return (
    <table className="mt-2 w-full text-xs">
      <thead>
        <tr className="border-b border-panel-border text-left text-panel-fg/50">
          <th className="py-1.5 pr-4 font-medium">Week ending</th>
          <th className="py-1.5 pr-4 text-right font-medium">Foreign buy</th>
          <th className="py-1.5 pr-4 text-right font-medium">Foreign sell</th>
          <th className="py-1.5 text-right font-medium">Net</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-panel-border">
        {periods.map((p) => (
          <tr key={p.periodEnd}>
            <td className="py-1.5 pr-4 text-panel-fg">
              {new Date(p.periodEnd + "T00:00:00Z").toLocaleDateString("en-PH", {
                month: "short",
                day: "numeric",
                timeZone: "UTC",
              })}
            </td>
            <td className="py-1.5 pr-4 text-right tabular-nums text-panel-fg">{formatPeso(p.foreignBuyValue)}</td>
            <td className="py-1.5 pr-4 text-right tabular-nums text-panel-fg">{formatPeso(p.foreignSellValue)}</td>
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
    <div className="rounded-lg bg-panel p-4 ring-1 ring-panel-border">
      <h2 className="text-sm font-medium text-panel-fg">{title}</h2>
      <p className="text-[11px] text-panel-fg/60">
        As of {new Date(periodEnd + "T00:00:00Z").toLocaleDateString("en-PH", { month: "short", day: "numeric", timeZone: "UTC" })}
      </p>
      {rows.length > 0 ? (
        <ol className="mt-2.5 flex flex-col divide-y divide-panel-border text-sm">
          {rows.map((r) => (
            <li key={r.ticker}>
              <Link
                href={`/stocks/${r.ticker}`}
                className="-mx-1.5 flex items-center justify-between gap-2 rounded px-1.5 py-1.5 transition-colors hover:bg-panel-raised"
              >
                <span className="min-w-0 truncate text-panel-fg">
                  <span className="text-panel-fg/50">{r.rank}.</span>{" "}
                  <span className="font-mono text-xs">{r.ticker}</span> {r.companyName}
                </span>
                <span className={`shrink-0 tabular-nums ${toneClass}`}>{formatPeso(r.netValue)}</span>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-2 text-sm text-panel-fg/50">No data for this period.</p>
      )}
    </div>
  );
}
