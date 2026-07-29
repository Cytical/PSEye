import Link from "next/link";
import type { DailyRecap } from "@/lib/dailyRecap";
import { ShareButton } from "@/components/ShareButton";
import { MarketHistogram } from "@/components/MarketHistogram";
import { DailyRecapDateNav } from "@/components/DailyRecapDateNav";
import { DailyRecapShareCard } from "@/components/DailyRecapShareCard";
import {
  Panel,
  StatTile,
  MoverList,
  MostActiveList,
  ForeignFlowSummary,
  NewsList,
  DisclosuresList,
  pct2OrDash,
} from "@/components/DailyRecapPanels";

/**
 * The whole body of a daily recap, shared by the two routes that render one:
 * `/daily/[date]` (the dated permalink) and `/daily` (the evergreen "latest
 * session" entry point). `/daily` used to `redirect()` here instead, but a
 * `redirect()` in a prerendered route compiles to a `<meta http-equiv="refresh">`
 * rather than an HTTP 3xx, which Search Console reports as a redirect error on a
 * URL that is both sitemapped and self-canonical. Rendering the same component
 * from both routes keeps `/daily` a genuine 200 with no redirect of any kind.
 *
 * Market Overview and Sector Movers used to have their own row here, but now
 * live inside DailyRecapShareCard's right column instead — see that
 * component's own doc comment.
 */

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
            shareTitle={`PSE Daily Recap: ${formatLongDate(recap.date)}`}
            shareText={
              snapshot
                ? `PSEi closed at ${snapshot.pseiValue.toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} (${snapshot.pseiPctChange >= 0 ? "+" : ""}${snapshot.pseiPctChange.toFixed(
                    2
                  )}%). Full PSE recap on PSEye`
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
          marketOverview={recap.marketOverview}
          sectorMoves={recap.sectorMoves}
        />
      </div>

      {/* Movers row, then a two-column stack: quant/breadth panels on the
          left, text/reading panels (news, disclosures) on the right —
          grouped by kind rather than one big auto-wrapping bag, so no panel
          ever gets stranded alone in a mostly-empty row. Block Sales is the
          one feed still left out entirely — it has its own full page
          (/block-sales) and there wasn't a natural pairing for it here. */}
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
      </div>

      {/* Quant/breadth panels on the left, reading panels on the right —
          each column stacks two panels rather than sitting in one flat row,
          which is also what fixed news's old problem: it used to share a
          70/30 row with the PSEi chart in the hero card above, where a
          4-headline list left a permanent empty gap under a much taller
          chart. Here it's paired with Disclosures, a peer of similar
          length, in a column of its own instead of racing a chart for
          height. */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="flex flex-col gap-3">
          {/* Shown whenever the day has quotes at all, not just when foreign
              flow itself is populated — that's what lets it render the
              explicit "no data" message below instead of just vanishing. */}
          {(recap.foreignBuys.length > 0 ||
            recap.foreignSells.length > 0 ||
            recap.marketOverview.totalMarketCap > 0) && (
            <Panel title="Foreign Fund Flow" moreHref="/foreign-flow" size="full">
              <ForeignFlowSummary buys={recap.foreignBuys} sells={recap.foreignSells} />
            </Panel>
          )}
          {breadth && breadth.histogram.length > 1 && (
            <Panel title="Breadth Detail" size="full">
              <div className="grid grid-cols-2 gap-2">
                <StatTile label="Median move" value={pct2OrDash(breadth.medianMove)} />
                <StatTile label="Average move" value={pct2OrDash(breadth.meanMove)} />
                <StatTile
                  label="Dispersion (σ)"
                  value={breadth.moveStdev == null ? "N/A" : `${breadth.moveStdev.toFixed(2)}%`}
                />
                <StatTile
                  label="% advancing"
                  value={breadth.positivePct == null ? "N/A" : `${breadth.positivePct.toFixed(0)}%`}
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

        <div className="flex flex-col gap-3">
          {recap.news.length > 0 && (
            <Panel title="In the News" moreHref="/news" size="full" scroll>
              <NewsList news={recap.news} />
            </Panel>
          )}
          {recap.disclosures.length > 0 && (
            <Panel title="Disclosures" moreHref="/disclosures" size="full" scroll>
              <DisclosuresList disclosures={recap.disclosures.slice(0, 8)} />
            </Panel>
          )}
        </div>
      </div>

      <p className="mt-3 text-xs text-panel-fg/68">
        Generated from PSEye&apos;s own recorded data for this date. Sections without data are
        omitted, not estimated.
      </p>
    </div>
  );
}
