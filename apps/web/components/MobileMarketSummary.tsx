import Link from "next/link";
import { changeColor } from "./MarketSummaryBar";
import type { MarketSnapshot } from "@/lib/marketSnapshot";
import type { LatestForeignFlow } from "@/lib/latestForeignFlow";

interface SummaryQuote {
  ticker: string;
  pctChange: number | null;
}

interface MobileMarketSummaryProps {
  snapshot: MarketSnapshot;
  foreignFlow: LatestForeignFlow;
  /** The whole day's quote set, *before* the map's active filter — breadth and
   * "top mover" are market-wide statistics, and computing them over the 30
   * mega caps a phone happens to be showing would report something else
   * entirely under the same labels. */
  quotes: SummaryQuote[];
  /** `/daily/[date]` for the most recent recorded session. */
  recapHref: string;
}

function formatPeso(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "−" : "+";
  if (abs >= 1_000_000_000) return `${sign}₱${(abs / 1_000_000_000).toFixed(2)}B`;
  return `${sign}₱${(abs / 1_000_000).toFixed(0)}M`;
}

function formatUpdatedAt(capturedAt: string): string {
  return new Date(capturedAt).toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  });
}

/**
 * Phone-only "today at a glance" card, rendered *above* the treemap.
 *
 * The homepage's only numeric content used to be desktop-only: the full
 * MarketSummaryBar and TopMovers live in the filter sidebar, which is
 * `hidden sm:block` / ordered below the map on mobile. So a phone visitor's
 * entire first screen was a headline plus ~280 fingernail-sized tiles, and the
 * one page on the site that actually reads well on a phone — the daily recap —
 * was several taps away. This puts the recap's headline numbers (index,
 * breadth, biggest movers, foreign flow) on the URL that already ranks, and
 * links through to the full recap rather than duplicating it.
 *
 * Deliberately not rendered in a past-date view: `snapshot`/`foreignFlow` are
 * always today's readings, and the time-machine banner already offers that
 * day's own recap link.
 */
export function MobileMarketSummary({ snapshot, foreignFlow, quotes, recapHref }: MobileMarketSummaryProps) {
  const withChange = quotes.filter((q): q is SummaryQuote & { pctChange: number } => q.pctChange !== null);
  const advancers = withChange.filter((q) => q.pctChange > 0).length;
  const decliners = withChange.filter((q) => q.pctChange < 0).length;
  const unchanged = withChange.length - advancers - decliners;

  const sorted = [...withChange].sort((a, b) => b.pctChange - a.pctChange);
  const topGainer = sorted[0] ?? null;
  const topLoser = sorted.length > 1 ? sorted[sorted.length - 1] : null;

  // Guarded: an empty or all-null quote set (mock fallback edge, or a filter
  // that matched nothing) would otherwise make both widths NaN%.
  const total = withChange.length || 1;

  return (
    <section className="rounded-xl bg-panel p-3 shadow-sm shadow-black/5 ring-1 ring-panel-border sm:hidden">
      <div className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="kicker text-panel-fg/72">PSEi</div>
          <div className="text-2xl font-bold leading-tight tracking-tight tabular-nums text-panel-fg">
            {snapshot.pseiValue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>
        <div className="shrink-0 text-right">
          <div className={`text-sm font-semibold tabular-nums ${changeColor(snapshot.pseiChange)}`}>
            {snapshot.pseiChange >= 0 ? "▲" : "▼"} {snapshot.pseiChange >= 0 ? "+" : ""}
            {snapshot.pseiChange.toFixed(2)} ({snapshot.pseiPctChange >= 0 ? "+" : ""}
            {snapshot.pseiPctChange.toFixed(2)}%)
          </div>
          <div className="text-[10px] tabular-nums text-panel-fg/65">
            Updated {formatUpdatedAt(snapshot.capturedAt)} PHT
          </div>
        </div>
      </div>

      {/* Breadth as a proportional bar rather than three numbers — on a phone
          the shape of the day reads faster than the counts do. */}
      {withChange.length > 0 && (
        <>
          <div
            className="mt-3 flex h-1.5 overflow-hidden rounded-full bg-panel-raised"
            role="img"
            aria-label={`Market breadth: ${advancers} advancing, ${decliners} declining, ${unchanged} unchanged`}
          >
            <div className="bg-up" style={{ width: `${(advancers / total) * 100}%` }} />
            <div className="bg-panel-fg/20" style={{ width: `${(unchanged / total) * 100}%` }} />
            <div className="bg-down" style={{ width: `${(decliners / total) * 100}%` }} />
          </div>
          <div className="mt-1 flex items-center justify-between text-[11px] font-medium tabular-nums">
            <span className="text-up">{advancers} up</span>
            <span className="text-panel-fg/65">{unchanged} flat</span>
            <span className="text-down">{decliners} down</span>
          </div>
        </>
      )}

      <div className="mt-3 grid grid-cols-3 gap-2 border-t border-panel-border pt-3">
        <MoverCell label="Top gainer" quote={topGainer} />
        <MoverCell label="Top loser" quote={topLoser} />
        <div className="min-w-0">
          <div className="kicker text-panel-fg/68">Foreign</div>
          <div className={`mt-0.5 truncate text-sm font-semibold tabular-nums ${changeColor(foreignFlow.netValue)}`}>
            {formatPeso(foreignFlow.netValue)}
          </div>
          <div className="truncate text-[10px] text-panel-fg/65">
            {foreignFlow.netValue >= 0 ? "net buy, wk" : "net sell, wk"}
          </div>
        </div>
      </div>

      <Link
        href={recapHref}
        className="mt-3 flex items-center justify-center gap-1.5 rounded-md bg-panel-active px-3 py-2 text-xs font-semibold text-panel-fg transition-colors hover:brightness-110"
      >
        Full daily recap
        <span aria-hidden>→</span>
      </Link>
    </section>
  );
}

function MoverCell({ label, quote }: { label: string; quote: (SummaryQuote & { pctChange: number }) | null }) {
  if (!quote) {
    return (
      <div className="min-w-0">
        <div className="kicker text-panel-fg/68">{label}</div>
        <div className="mt-0.5 text-sm font-semibold text-panel-fg/65">N/A</div>
      </div>
    );
  }

  return (
    <Link href={`/stocks/${quote.ticker}`} className="min-w-0">
      <div className="kicker text-panel-fg/68">{label}</div>
      <div className="mt-0.5 truncate font-mono text-sm font-semibold text-panel-fg">{quote.ticker}</div>
      <div className={`truncate text-[10px] font-semibold tabular-nums ${changeColor(quote.pctChange)}`}>
        {quote.pctChange >= 0 ? "+" : ""}
        {quote.pctChange.toFixed(2)}%
      </div>
    </Link>
  );
}
