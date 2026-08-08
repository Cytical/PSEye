import type { Metadata } from "next";
import Link from "next/link";
import type { StockForeignFlow } from "@pseye/source-foreign-flow";
import { ForeignFlowChart } from "@/components/ForeignFlowChart";
import { getForeignFlowPageData, type GrossFlowPoint, type IndexFlowPoint } from "@/lib/foreignFlow";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "PSE Foreign Buying & Selling: Net Fund Flow",
  description: "Daily index-level and per-stock net foreign buying/selling on the PSE.",
  alternates: { canonical: "/foreign-flow" },
};

function formatPeso(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}₱${(abs / 1_000_000_000).toFixed(2)}B`;
  return `${sign}₱${(abs / 1_000_000).toFixed(0)}M`;
}

export default async function ForeignFlowPage() {
  const { indexFlow, indexFlowGranularity, grossFlow, periodEnd, topBuying, topSelling, stockFlowSource } =
    await getForeignFlowPageData();

  const indexFlowDescription =
    indexFlowGranularity === "daily"
      ? "Index-level foreign buying vs. selling by trading day, from PSE's Daily Quotation Report."
      : "Index-level foreign buying vs. selling by week, from PSE's Market Watch report (daily data isn't available yet).";

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8">
      <p className="kicker text-accent">Market Data</p>
      <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-panel-fg sm:text-3xl">Foreign Fund Flow</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-panel-fg/65">
        {indexFlowDescription} Plus daily per-stock net foreign buying/selling, also from the Daily
        Quotation Report.
      </p>

      <div className="mt-8 rounded-xl bg-panel p-4 shadow-sm shadow-black/5 ring-1 ring-panel-border">
        {indexFlow.length > 0 ? (
          <>
            <ForeignFlowChart periods={indexFlow} granularity={indexFlowGranularity} />
            <div className="mt-1 flex items-center gap-4 text-[11px] text-panel-fg/72">
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-up" />
                Net buying
              </span>
              <span className="flex items-center gap-1.5">
                <span className="inline-block h-2 w-2 rounded-full bg-down" />
                Net selling
              </span>
            </div>

            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-xs text-panel-fg/68 hover:text-panel-fg/80">
                Show as table
              </summary>
              <IndexFlowTable periods={indexFlow} />
            </details>
          </>
        ) : (
          <p className="text-sm text-panel-fg/68">No index-level foreign flow on record yet.</p>
        )}
      </div>

      {grossFlow.length > 0 && <GrossFlowPanel periods={grossFlow} />}

      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <FlowTable title="Top net foreign buying" rows={topBuying} tone="up" periodEnd={periodEnd} />
        <FlowTable title="Top net foreign selling" rows={topSelling} tone="down" periodEnd={periodEnd} />
      </div>

      <p className="mt-6 text-xs text-panel-fg/72">
        {stockFlowSource === "real"
          ? "Per-stock rankings are real daily net foreign buying/selling figures from PSE's Daily Quotation Report."
          : "Per-stock rankings above are sample data. The real daily source hasn't populated any rows yet."}
      </p>
    </div>
  );
}

/**
 * Date + Net only — no Foreign buy/sell columns. The daily source (the
 * common case now, see getForeignFlowPageData) only ever has one signed net
 * figure per stock to sum, never a separate gross buy/sell total, so a
 * buy/sell breakdown would either be missing for most rows or (worse)
 * silently mix real weekly gross totals with fabricated daily ones. Net is
 * the one number both the daily and weekly tiers can report honestly.
 */
function IndexFlowTable({ periods }: { periods: IndexFlowPoint[] }) {
  return (
    <div className="mt-2 overflow-x-auto">
      <table className="w-full min-w-[240px] text-xs">
        <thead>
          <tr className="border-b border-panel-border text-left text-panel-fg/68">
            <th className="py-1.5 pr-4 font-medium">Date</th>
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
              <td
                className={`py-1.5 text-right font-medium tabular-nums ${p.netValue >= 0 ? "text-up" : "text-down"}`}
              >
                {formatPeso(p.netValue)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** "Aug 1" for a week-ending date. */
function shortDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

/**
 * Weekly gross foreign buying vs. selling.
 *
 * Its own panel, below the net chart, rather than two more columns on
 * IndexFlowTable: that table now renders daily rows in the common case, and
 * the gross split only exists weekly (see GrossFlowPoint's doc comment). Two
 * different periods in one table would read as one series.
 *
 * Paired bars both grow from the left on a shared scale, so the comparison the
 * panel exists for (how big was the buying against the selling) is a direct
 * length comparison. A diverging axis would look more like the net chart above
 * and invite exactly the misreading this panel is meant to prevent.
 *
 * Plain CSS widths, no canvas: this is a short list of static bars, and it
 * costs the page no client JS at all.
 */
function GrossFlowPanel({ periods }: { periods: GrossFlowPoint[] }) {
  const recent = periods.slice(-8).reverse();
  const scale = Math.max(...recent.flatMap((p) => [p.buyValue, p.sellValue]), 1);

  return (
    <div className="mt-6 rounded-xl bg-panel p-4 shadow-sm shadow-black/5 ring-1 ring-panel-border">
      <h2 className="kicker text-panel-fg/70">Weekly gross buying vs. selling</h2>
      <p className="mt-1 max-w-2xl text-[11px] leading-relaxed text-panel-fg/72">
        How much foreign money moved in each direction, not just the difference. A quiet week and a
        heavily traded week can both net out near zero. From PSE&apos;s weekly Market Watch report,
        which is the only source that separates the two sides.
      </p>

      <ol className="mt-3 flex flex-col gap-3">
        {recent.map((p) => (
          <li key={p.periodEnd} className="grid grid-cols-[auto_1fr] items-center gap-x-3 gap-y-1">
            <span className="row-span-2 w-12 shrink-0 text-[11px] tabular-nums text-panel-fg/68">
              {shortDate(p.periodEnd)}
            </span>
            <div className="flex items-center gap-2">
              <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-sm bg-panel-raised">
                <div className="h-full rounded-sm bg-up" style={{ width: `${(p.buyValue / scale) * 100}%` }} />
              </div>
              <span className="w-16 shrink-0 text-right text-[11px] tabular-nums text-up">
                {formatPeso(p.buyValue)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-sm bg-panel-raised">
                <div className="h-full rounded-sm bg-down" style={{ width: `${(p.sellValue / scale) * 100}%` }} />
              </div>
              <span className="w-16 shrink-0 text-right text-[11px] tabular-nums text-down">
                {formatPeso(p.sellValue)}
              </span>
            </div>
          </li>
        ))}
      </ol>

      <div className="mt-3 flex items-center gap-4 text-[11px] text-panel-fg/72">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-up" />
          Gross buying
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full bg-down" />
          Gross selling
        </span>
        <span>Week ending shown at left.</span>
      </div>
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
  const toneClass = tone === "up" ? "text-up" : "text-down";
  return (
    // min-w-0: this is a grid item, and the default min-width: auto sized the
    // column to the longest company name below, scrolling the page sideways by
    // 107px on a 390px phone.
    <div className="min-w-0 rounded-xl bg-panel p-4 shadow-sm shadow-black/5 ring-1 ring-panel-border">
      <h2 className="kicker text-panel-fg/70">{title}</h2>
      <p className="text-[11px] text-panel-fg/72">
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
                  <span className="text-panel-fg/68">{r.rank}.</span>{" "}
                  <span className="font-mono text-xs">{r.ticker}</span> {r.companyName}
                </span>
                <span className={`shrink-0 tabular-nums ${toneClass}`}>{formatPeso(r.netValue)}</span>
              </Link>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-2 text-sm text-panel-fg/68">No data for this period.</p>
      )}
    </div>
  );
}
