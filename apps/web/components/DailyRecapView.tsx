import type { ReactNode } from "react";
import Link from "next/link";
import type { DailyRecap } from "@/lib/dailyRecap";
import { ShareButton } from "@/components/ShareButton";
import { MarketHistogram } from "@/components/MarketHistogram";
import { DailyRecapDateNav } from "@/components/DailyRecapDateNav";
import { DailyRecapShareCard } from "@/components/DailyRecapShareCard";

/**
 * The whole body of a daily recap, shared by the two routes that render one:
 * `/daily/[date]` (the dated permalink) and `/daily` (the evergreen "latest
 * session" entry point). `/daily` used to `redirect()` here instead, but a
 * `redirect()` in a prerendered route compiles to a `<meta http-equiv="refresh">`
 * rather than an HTTP 3xx, which Search Console reports as a redirect error on a
 * URL that is both sitemapped and self-canonical. Rendering the same component
 * from both routes keeps `/daily` a genuine 200 with no redirect of any kind.
 */

const UP = "var(--up)";
const DOWN = "var(--down)";

export function formatLongDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatShortDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatCompactPeso(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `₱${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `₱${(n / 1e6).toFixed(1)}M`;
  return `₱${Math.round(n).toLocaleString("en-PH")}`;
}

function pct2OrDash(n: number | null): string {
  if (n == null) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function StatTile({ label, value }: { label: string; value: string }) {
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
 */
function Panel({
  title,
  moreHref,
  scroll,
  children,
}: {
  title: string;
  moreHref?: string;
  scroll?: boolean;
  children: ReactNode;
}) {
  return (
    // min-w-0 because these are grid items, and a grid item's default
    // min-width: auto sizes the track to its content's min-content width. The
    // mover/flow lists inside carry long company names, so on a 390px phone the
    // column resolved to 415px and the whole /daily page scrolled sideways by
    // 58px. With the floor removed the track follows the container and the
    // links' existing `truncate` ellipsizes the names, which is what it was
    // always there to do.
    // flex-1 + a basis floor (rather than a grid track) so that when a row has
    // fewer populated panels than the layout has room for — e.g. no foreign
    // flow data that day — the panels that *do* exist stretch to fill the
    // row instead of leaving a dead gap next to them, capped with a max-width
    // rather than left to stretch indefinitely. basis-[420px] targets 3 per
    // row on a real desktop viewport (~1550px of content width) rather than
    // the previous 260px floor, which packed 5 cramped, truncating panels
    // into row one and left row two's lone survivor an isolated 440px box
    // with most of the row empty beside it — still the "wasted space"
    // complaint, just relocated. Wider panels also mean disclosure headlines
    // and company names stop truncating as aggressively.
    <section className="flex min-w-0 max-w-[560px] flex-1 basis-[420px] flex-col rounded-xl bg-panel p-3 shadow-sm shadow-black/5 ring-1 ring-panel-border">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="kicker text-panel-fg/68">{title}</h2>
        {moreHref && (
          <Link href={moreHref} className="shrink-0 text-[11px] text-panel-fg/65 hover:underline">
            All →
          </Link>
        )}
      </div>
      <div className={scroll ? "mt-2 max-h-64 overflow-y-auto pr-1" : "mt-2"}>{children}</div>
    </section>
  );
}

function MoverList({ movers }: { movers: DailyRecap["gainers"] }) {
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

function MostActiveList({ rows }: { rows: DailyRecap["mostActive"] }) {
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
 * One aggregate bar, not a per-ticker breakdown — `stock_foreign_flow` only
 * stores the top 10 net buyers and top 10 net sellers each day (see that
 * table's own doc comment), not the full ~380-ticker board, so "all stocks"
 * here really means "all of what's tracked". Net buying grows left from a
 * center zero-line, net selling grows right, same convention the per-ticker
 * version this replaced used, just collapsed to the two totals. The single
 * biggest buyer/seller are called out below the bar (buys/sells arrive
 * ranked by |value| already, per getStockForeignFlowByDate's `orderBy(rank)`
 * — first row is the biggest) — the aggregate alone left this panel visibly
 * shorter than its row-mates (Sector Movers, Breadth Detail), and "who
 * actually moved the most money" is a real, specific detail worth surfacing
 * even after collapsing the rest to one number.
 */
function ForeignFlowSummary({ buys, sells }: { buys: DailyRecap["foreignBuys"]; sells: DailyRecap["foreignSells"] }) {
  const buyTotal = buys.reduce((sum, r) => sum + r.netValue, 0);
  const sellTotal = sells.reduce((sum, r) => sum + r.netValue, 0); // already negative per-row
  const net = buyTotal + sellTotal;
  const maxAbs = Math.max(1, buyTotal, Math.abs(sellTotal));
  const buyPct = (buyTotal / maxAbs) * 50;
  const sellPct = (Math.abs(sellTotal) / maxAbs) * 50;
  const topBuy = buys[0];
  const topSell = sells[0];

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-xs text-panel-fg/65">Net</span>
        <span className="text-lg font-semibold tabular-nums" style={{ color: net >= 0 ? UP : DOWN }}>
          {net >= 0 ? "+" : "−"}
          {formatCompactPeso(Math.abs(net))}
        </span>
      </div>
      <div className="relative mt-2 h-2 rounded-full bg-panel-border/60">
        <div className="absolute inset-y-0 left-1/2 w-px bg-panel-border" />
        <div className="absolute inset-y-0 rounded-l-full" style={{ right: "50%", width: `${buyPct}%`, background: UP }} />
        <div className="absolute inset-y-0 rounded-r-full" style={{ left: "50%", width: `${sellPct}%`, background: DOWN }} />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[11px]">
        <span style={{ color: UP }}>Buying {formatCompactPeso(buyTotal)}</span>
        <span style={{ color: DOWN }}>Selling {formatCompactPeso(Math.abs(sellTotal))}</span>
      </div>

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
function SectorMoversList({ sectors }: { sectors: DailyRecap["sectorMoves"] }) {
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
                  className="absolute inset-y-0 rounded-l-full"
                  style={{ right: "50%", width: `${halfWidthPct}%`, background: UP }}
                />
              ) : (
                <div
                  className="absolute inset-y-0 rounded-r-full"
                  style={{ left: "50%", width: `${halfWidthPct}%`, background: DOWN }}
                />
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export function DailyRecapView({
  recap,
  availableDates,
}: {
  recap: DailyRecap;
  availableDates: string[];
}) {
  const { snapshot, breadth } = recap;

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="kicker text-accent">Daily Recap</p>
          <h1 className="mt-0.5 font-serif text-xl font-semibold tracking-tight text-panel-fg sm:text-2xl">
            {formatLongDate(recap.date)}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {recap.prevDate && (
            <Link
              href={`/daily/${recap.prevDate}`}
              className="rounded-lg bg-panel px-3 py-1.5 text-sm text-panel-fg/70 shadow-sm shadow-black/5 ring-1 ring-panel-border transition-colors hover:bg-panel-raised hover:text-panel-fg"
            >
              ← {formatShortDate(recap.prevDate)}
            </Link>
          )}
          <DailyRecapDateNav date={recap.date} availableDates={availableDates} />
          {recap.nextDate && (
            <Link
              href={`/daily/${recap.nextDate}`}
              className="rounded-lg bg-panel px-3 py-1.5 text-sm text-panel-fg/70 shadow-sm shadow-black/5 ring-1 ring-panel-border transition-colors hover:bg-panel-raised hover:text-panel-fg"
            >
              {formatShortDate(recap.nextDate)} →
            </Link>
          )}
          <ShareButton
            shareTitle={`PSE Daily Recap — ${formatLongDate(recap.date)}`}
            shareText={
              snapshot
                ? `PSEi closed at ${snapshot.pseiValue.toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} (${snapshot.pseiPctChange >= 0 ? "+" : ""}${snapshot.pseiPctChange.toFixed(
                    2
                  )}%) — full PSE recap on PSEye`
                : `The full PSE market recap for ${formatLongDate(recap.date)} on PSEye`
            }
          />
        </div>
      </div>

      <div className="mt-4">
        <DailyRecapShareCard
          dateLabel={formatLongDate(recap.date)}
          snapshot={snapshot}
          breadth={breadth}
          pseiHistory={recap.pseiHistory}
          news={recap.news}
        />
      </div>

      {/* One dashboard row rather than the old full-width stacked sections —
          each panel caps its list at a scrollable max height (see Panel's
          `scroll` prop) so this layout's total height stays bounded
          regardless of how many movers/news items came in that day, instead
          of the page growing with the data. flex-wrap packs however many
          panels actually have data into as few rows as fit. Disclosures and
          Block Sales dropped from this row entirely — both have their own
          full pages (/disclosures, /block-sales) and duplicating them here
          crowded out the stats specific to a day's session with content
          that's really a filtered view of a different, longer-running feed. */}
      <div className="mt-3 flex flex-wrap gap-3">
        {recap.gainers.length > 0 && (
          <Panel title="Top Gainers">
            <MoverList movers={recap.gainers} />
          </Panel>
        )}
        {recap.losers.length > 0 && (
          <Panel title="Top Losers">
            <MoverList movers={recap.losers} />
          </Panel>
        )}
        {recap.mostActive.length > 0 && (
          <Panel title="Most Active" moreHref="/most-active">
            <MostActiveList rows={recap.mostActive} />
          </Panel>
        )}
        {(recap.foreignBuys.length > 0 || recap.foreignSells.length > 0) && (
          <Panel title="Foreign Fund Flow" moreHref="/foreign-flow">
            <ForeignFlowSummary buys={recap.foreignBuys} sells={recap.foreignSells} />
          </Panel>
        )}
        {recap.sectorMoves.length > 0 && (
          <Panel title="Sector Movers" moreHref="/sectors">
            <SectorMoversList sectors={recap.sectorMoves} />
          </Panel>
        )}
        {breadth && breadth.histogram.length > 1 && (
          <Panel title="Breadth Detail">
            <div className="grid grid-cols-2 gap-2">
              <StatTile label="Median move" value={pct2OrDash(breadth.medianMove)} />
              <StatTile label="Average move" value={pct2OrDash(breadth.meanMove)} />
              <StatTile
                label="Dispersion (σ)"
                value={breadth.moveStdev == null ? "—" : `${breadth.moveStdev.toFixed(2)}%`}
              />
              <StatTile
                label="% advancing"
                value={breadth.positivePct == null ? "—" : `${breadth.positivePct.toFixed(0)}%`}
              />
            </div>
            <div className="mt-2">
              <MarketHistogram
                bins={breadth.histogram}
                colorSplit={0}
                formatX={(x) => `${x >= 0 ? "+" : ""}${x.toFixed(1)}%`}
              />
            </div>
          </Panel>
        )}
      </div>

      <p className="mt-3 text-xs text-panel-fg/68">
        Generated from data recorded by PSEye&apos;s own pipeline on this date — sections without
        recorded data are omitted rather than estimated.
      </p>
    </div>
  );
}
