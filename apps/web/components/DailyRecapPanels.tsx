import type { ReactNode } from "react";
import Link from "next/link";
import type { DailyRecap } from "@/lib/dailyRecap";

/**
 * Presentational pieces shared between `DailyRecapView` (the full page body)
 * and `DailyRecapShareCard` (the glanceable summary card at the top of that
 * same page) — split out here so the card can embed panels like Market
 * Overview / Sector Movers without a circular import between the two
 * higher-level components.
 */

const UP = "var(--up)";
const DOWN = "var(--down)";

export function formatCompactPeso(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e12) return `₱${(n / 1e12).toFixed(2)}T`;
  if (abs >= 1e9) return `₱${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `₱${(n / 1e6).toFixed(1)}M`;
  return `₱${Math.round(n).toLocaleString("en-PH")}`;
}

export function formatIndexValue(n: number | null): string {
  if (n == null) return "N/A";
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function pct2OrDash(n: number | null): string {
  if (n == null) return "N/A";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

export function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-panel-raised p-2 ring-1 ring-panel-border">
      <div className="text-[10px] text-panel-fg/68">{label}</div>
      <div className="mt-0.5 text-sm font-semibold tabular-nums text-panel-fg">{value}</div>
    </div>
  );
}

/**
 * A dashboard tile. `scroll` caps the body at a fixed height with internal
 * overflow instead of letting the list stretch the panel (and the page) —
 * that's what lets the whole recap sit in a fixed-height grid without the
 * page itself needing to scroll, only an individual overfull panel.
 *
 * From `sm` up only. On a phone the recap is a single stacked column with no
 * fixed-height grid to preserve, so the cap buys nothing and costs the page
 * scroll: a touch drag landing inside one of these panels scrolls the list
 * within it instead of the page. Same fix as components/Panel.tsx, which has
 * the longer write-up.
 */
export function Panel({
  title,
  moreHref,
  scroll,
  size = "normal",
  children,
}: {
  title: string;
  moreHref?: string;
  scroll?: boolean;
  /**
   * "normal": the 3-per-row movers cap. "wide": a bigger basis/cap so 2
   * panels split their row evenly. "full": no basis/cap at all — for panels
   * stacked in their own column (see the Foreign Fund Flow/News two-column
   * group in DailyRecapView, and the Market Overview/Sector Movers column
   * inside DailyRecapShareCard), where the column's own width should win
   * outright rather than being capped short of it.
   */
  size?: "normal" | "wide" | "full";
  children: ReactNode;
}) {
  return (
    // min-w-0 because these are grid/flex items, and a grid item's default
    // min-width: auto sizes the track to its content's min-content width. The
    // mover/flow lists inside carry long company names, so on a 390px phone the
    // column resolved wider than its container and the whole page scrolled
    // sideways. With the floor removed the track follows the container and the
    // links' existing `truncate` ellipsizes the names, which is what it was
    // always there to do.
    <section
      className={`flex min-w-0 flex-1 flex-col rounded-xl bg-panel p-3 shadow-sm shadow-black/5 ring-1 ring-panel-border ${
        size === "full" ? "w-full" : size === "wide" ? "basis-[480px] max-w-[760px]" : "basis-[420px] max-w-[560px]"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="kicker text-panel-fg/68">{title}</h2>
        {moreHref && (
          <Link href={moreHref} className="shrink-0 text-[11px] text-panel-fg/65 hover:underline">
            All →
          </Link>
        )}
      </div>
      <div
        className={
          scroll
            ? "mt-2 pr-1 sm:max-h-64 sm:overflow-y-auto"
            : "mt-2 flex flex-1 flex-col justify-center"
        }
      >
        {children}
      </div>
    </section>
  );
}

export function MoverList({ movers }: { movers: DailyRecap["gainers"] }) {
  return (
    <ul className="flex flex-col gap-1">
      {movers.map((m) => (
        <li key={m.ticker} className="flex items-baseline justify-between gap-3 text-[13px]">
          <Link href={`/stocks/${m.ticker}`} className="min-w-0 truncate hover:underline">
            <span className="font-mono text-xs font-semibold text-panel-fg">{m.ticker}</span>
            <span className="ml-2 text-panel-fg/72">{m.companyName}</span>
          </Link>
          <span className="shrink-0 font-medium tabular-nums" style={{ color: m.pctChange >= 0 ? UP : DOWN }}>
            {m.pctChange >= 0 ? "+" : ""}
            {m.pctChange.toFixed(2)}%
          </span>
        </li>
      ))}
    </ul>
  );
}

export function MostActiveList({ rows }: { rows: DailyRecap["mostActive"] }) {
  return (
    <ul className="flex flex-col gap-1">
      {rows.map((r) => (
        <li key={r.ticker} className="flex items-baseline justify-between gap-3 text-[13px]">
          <Link href={`/stocks/${r.ticker}`} className="min-w-0 truncate hover:underline">
            <span className="font-mono text-xs font-semibold text-panel-fg">{r.ticker}</span>
            <span className="ml-2 text-panel-fg/72">{r.companyName}</span>
          </Link>
          <span className="flex shrink-0 items-baseline gap-2">
            <span className="font-medium tabular-nums text-panel-fg">{formatCompactPeso(r.value)}</span>
            <span className="text-[11px] tabular-nums" style={{ color: r.pctChange >= 0 ? UP : DOWN }}>
              {r.pctChange >= 0 ? "+" : ""}
              {r.pctChange.toFixed(2)}%
            </span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Total tracked market cap plus the PSEi's own trailing 1-month/1-year
 * average and 1-year high/low.
 */
export function MarketOverviewGrid({ overview }: { overview: DailyRecap["marketOverview"] }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <StatTile label="Total Market Cap" value={formatCompactPeso(overview.totalMarketCap)} />
      <StatTile
        label="PSEi 1Y High / Low"
        value={`${formatIndexValue(overview.yearHighPsei)} / ${formatIndexValue(overview.yearLowPsei)}`}
      />
      <StatTile label="PSEi 1M Avg" value={formatIndexValue(overview.monthAvgPsei)} />
      <StatTile label="PSEi 1Y Avg" value={formatIndexValue(overview.yearAvgPsei)} />
    </div>
  );
}

/**
 * One aggregate bar, not a per-ticker breakdown — `stock_foreign_flow` only
 * stores the top 10 net buyers and top 10 net sellers each day (see that
 * table's own doc comment), not the full ~380-ticker board, so "all stocks"
 * here really means "all of what's tracked". Net buying grows left from a
 * center zero-line, net selling grows right, same convention the per-ticker
 * version this replaced used, just collapsed to the two totals. The single
 * biggest buyer/seller are called out below the bar (buys/sells arrive
 * ranked by |value| already, per getStockForeignFlowByDate's `orderBy(rank)`
 * — first row is the biggest).
 */
export function ForeignFlowSummary({
  buys,
  sells,
}: {
  buys: DailyRecap["foreignBuys"];
  sells: DailyRecap["foreignSells"];
}) {
  const hasFlow = buys.length > 0 || sells.length > 0;
  const buyTotal = buys.reduce((sum, r) => sum + r.netValue, 0);
  const sellTotal = sells.reduce((sum, r) => sum + r.netValue, 0); // already negative per-row
  const net = buyTotal + sellTotal;
  // Each side's share of buying+selling combined, not scaled against a
  // shared max — the old scale left the smaller side's bar short of the
  // center line and the *larger* side capped at exactly half, so whichever
  // side lost always left visible empty track. Proportional-of-total always
  // sums to 100%, so the two colors fill the whole bar with nothing left
  // over to show a background/grey segment through.
  const totalAbs = Math.max(1, buyTotal + Math.abs(sellTotal));
  const buyPct = (buyTotal / totalAbs) * 100;
  const sellPct = (Math.abs(sellTotal) / totalAbs) * 100;
  const topBuy = buys[0];
  const topSell = sells[0];

  return (
    <div>
      {/* A genuine zero-net day is implausible for real foreign trading — an
          empty buys/sells pair means this source has no data recorded for
          the date, not that flow was exactly ₱0. Says so rather than
          rendering a bar/Net/Buying/Selling row that would otherwise look
          like a real (if boring) reading. */}
      {!hasFlow ? (
        <p className="text-[12px] text-panel-fg/65">No foreign flow data recorded for this date.</p>
      ) : (
        <>
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-panel-fg/65">Net</span>
            <span className="text-lg font-semibold tabular-nums" style={{ color: net >= 0 ? UP : DOWN }}>
              {net >= 0 ? "+" : "−"}
              {formatCompactPeso(Math.abs(net))}
            </span>
          </div>
          {/* Selling/red on the left, buying/green on the right. No
              center-zero marker: with the two sides now proportional to
              each other (always summing to 100%) rather than to a shared
              scale, the split point moves with the data and isn't "zero"
              anymore — a fixed 50% line would drift away from the actual
              color boundary and read as a stray tick mark. */}
          <div className="relative mt-2 h-2 overflow-hidden rounded-full bg-panel-border/60">
            <div className="absolute inset-y-0 left-0 rounded-l-full" style={{ width: `${sellPct}%`, background: DOWN }} />
            <div className="absolute inset-y-0 right-0 rounded-r-full" style={{ width: `${buyPct}%`, background: UP }} />
          </div>
          <div className="mt-1.5 flex items-center justify-between text-[11px]">
            <span style={{ color: DOWN }}>Selling {formatCompactPeso(Math.abs(sellTotal))}</span>
            <span style={{ color: UP }}>Buying {formatCompactPeso(buyTotal)}</span>
          </div>
        </>
      )}

      {(topBuy || topSell) && (
        <div className="mt-3 flex flex-col gap-1.5 border-t border-panel-border pt-2.5">
          {topBuy && (
            <div className="flex items-baseline justify-between text-[12px]">
              <span className="text-panel-fg/65">Top buy</span>
              <Link href={`/stocks/${topBuy.ticker}`} className="flex min-w-0 items-baseline gap-1.5 hover:underline">
                <span className="truncate text-panel-fg/80">{topBuy.companyName}</span>
                <span className="shrink-0 font-mono text-[11px] font-semibold text-panel-fg">{topBuy.ticker}</span>
                <span className="shrink-0 font-medium tabular-nums" style={{ color: UP }}>
                  +{formatCompactPeso(topBuy.netValue)}
                </span>
              </Link>
            </div>
          )}
          {topSell && (
            <div className="flex items-baseline justify-between text-[12px]">
              <span className="text-panel-fg/65">Top sell</span>
              <Link href={`/stocks/${topSell.ticker}`} className="flex min-w-0 items-baseline gap-1.5 hover:underline">
                <span className="truncate text-panel-fg/80">{topSell.companyName}</span>
                <span className="shrink-0 font-mono text-[11px] font-semibold text-panel-fg">{topSell.ticker}</span>
                <span className="shrink-0 font-medium tabular-nums" style={{ color: DOWN }}>
                  −{formatCompactPeso(Math.abs(topSell.netValue))}
                </span>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Breadth Detail cuts the whole market's move distribution one way; this
 * cuts the same day's traded stocks by sector instead — a diverging bar per
 * sector (same left/right-from-center convention as the foreign-flow
 * summary), ranked best to worst since `sectorMoves` already arrives sorted.
 */
export function SectorMoversList({ sectors }: { sectors: DailyRecap["sectorMoves"] }) {
  const maxAbs = Math.max(1, ...sectors.map((s) => Math.abs(s.avgPctChange)));
  return (
    <ul className="flex flex-col gap-1.5">
      {sectors.map((s) => {
        const isUp = s.avgPctChange >= 0;
        const halfWidthPct = (Math.abs(s.avgPctChange) / maxAbs) * 50;
        return (
          <li key={s.sector} className="text-[12px]">
            <div className="flex items-baseline justify-between gap-2">
              <span className="min-w-0 truncate text-panel-fg/80">{s.sector}</span>
              <span className="shrink-0 font-medium tabular-nums" style={{ color: isUp ? UP : DOWN }}>
                {isUp ? "+" : ""}
                {s.avgPctChange.toFixed(2)}%
              </span>
            </div>
            <div className="relative mt-0.5 h-1 rounded-full bg-panel-border/60">
              <div className="absolute inset-y-0 left-1/2 w-px bg-panel-border" />
              {isUp ? (
                <div
                  className="absolute inset-y-0 rounded-r-full"
                  style={{ left: "50%", width: `${halfWidthPct}%`, background: UP }}
                />
              ) : (
                <div
                  className="absolute inset-y-0 rounded-l-full"
                  style={{ right: "50%", width: `${halfWidthPct}%`, background: DOWN }}
                />
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function NewsList({ news }: { news: DailyRecap["news"] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {news.map((n) => (
        <li key={n.url} className="text-[13px]">
          <a
            href={n.url}
            target="_blank"
            rel="noopener noreferrer"
            className="line-clamp-2 leading-snug text-panel-fg/85 hover:underline"
          >
            {n.title}
          </a>
          <span className="mt-0.5 block text-[11px] text-panel-fg/55">{n.source}</span>
        </li>
      ))}
    </ul>
  );
}

export function DisclosuresList({ disclosures }: { disclosures: DailyRecap["disclosures"] }) {
  return (
    <ul className="flex flex-col gap-2.5">
      {disclosures.map((d, i) => (
        <li key={`${d.ticker}-${d.filedAt}-${i}`} className="text-[13px]">
          {d.url ? (
            <a
              href={d.url}
              target="_blank"
              rel="noopener noreferrer"
              className="line-clamp-2 leading-snug text-panel-fg/85 hover:underline"
            >
              {d.headline}
            </a>
          ) : (
            <span className="line-clamp-2 leading-snug text-panel-fg/85">{d.headline}</span>
          )}
          <span className="mt-0.5 flex items-baseline gap-1.5 text-[11px] text-panel-fg/55">
            <Link href={`/stocks/${d.ticker}`} className="font-mono font-semibold text-panel-fg/70 hover:underline">
              {d.ticker}
            </Link>
            <span className="truncate">{d.companyName}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}
