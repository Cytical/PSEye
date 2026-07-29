import type { Metadata } from "next";
import Link from "next/link";
import { getMarketStats, type Distribution } from "@/lib/marketStats";
import { MarketHistogram } from "@/components/MarketHistogram";

export const revalidate = 3600; // matches the quotes/historical ETL cadence

export const metadata: Metadata = {
  title: "PSE Market Statistics: Breadth & Return Distributions",
  description:
    "Cross-sectional statistics for the Philippine Stock Exchange: market breadth (advancers vs decliners), share of stocks above their moving averages, and the distribution of returns, volatility, and beta across the market. Free, no login.",
  alternates: { canonical: "/market-stats" },
};

function pct1(n: number | null): string {
  if (n == null) return "N/A";
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

export default async function MarketStatsPage() {
  const stats = await getMarketStats();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Market Map", item: siteUrl },
          { "@type": "ListItem", position: 2, name: "Market Statistics", item: `${siteUrl}/market-stats` },
        ],
      },
    ],
  };

  const b = stats.breadth;
  const breadthTotal = b.advancers + b.decliners + b.unchanged;

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="text-xs text-panel-fg/68">
        <Link href="/" className="hover:underline">
          Market Map
        </Link>
        <span className="mx-1.5">/</span>
        <span>Market Statistics</span>
      </nav>

      <p className="kicker mt-3 text-accent">Market Statistics</p>
      <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-panel-fg sm:text-3xl">
        Market-wide Statistics
      </h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-panel-fg/72">
        How the whole exchange looks in aggregate: breadth, trend participation, and the spread of
        returns, volatility, and beta across stocks. The cross-sectional companion to the per-stock{" "}
        <Link href="/analytics" className="underline hover:text-panel-fg">
          analytics
        </Link>{" "}
        rankings. Descriptive statistics on delayed / end-of-day PSE data, never a forecast or signal.
      </p>

      {/* Breadth — always available from today's quotes */}
      <section className="mt-8">
        <h2 className="font-serif text-lg font-semibold tracking-tight text-panel-fg">
          Market breadth (today)
        </h2>
        <p className="mt-1 max-w-3xl text-sm text-panel-fg/72">
          Of {stats.totalTracked} tracked stocks, how many rose vs. fell today, and the distribution
          of their percentage moves. Breadth shows whether a move is broad-based or driven by a few
          names.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tile label="Advancers" value={String(b.advancers)} tone="up" hint={sharePct(b.advancers, breadthTotal)} />
          <Tile label="Decliners" value={String(b.decliners)} tone="down" hint={sharePct(b.decliners, breadthTotal)} />
          <Tile label="Unchanged" value={String(b.unchanged)} hint={sharePct(b.unchanged, breadthTotal)} />
          <Tile label="No trade" value={String(b.noData)} hint="suspended / untraded" />
        </div>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tile label="Median move" value={pct2OrDash(b.todayMedian)} tone={toneOf(b.todayMedian)} />
          <Tile label="Average move" value={pct2OrDash(b.todayMean)} tone={toneOf(b.todayMean)} />
          <Tile label="Dispersion (σ)" value={b.todayStdev == null ? "N/A" : `${b.todayStdev.toFixed(2)}%`} hint="spread of moves" />
          <Tile label="% advancing" value={b.todayPositivePct == null ? "N/A" : `${b.todayPositivePct.toFixed(0)}%`} />
        </div>
        {b.todayHistogram.length > 1 && (
          <div className="mt-3 rounded-xl bg-panel p-3 shadow-sm shadow-black/5 ring-1 ring-panel-border">
            <p className="mb-1 text-xs text-panel-fg/68">Distribution of today&apos;s % change</p>
            <MarketHistogram bins={b.todayHistogram} colorSplit={0} formatX={(x) => `${x >= 0 ? "+" : ""}${x.toFixed(1)}%`} />
          </div>
        )}
      </section>

      {stats.source !== "real" || !stats.distributions ? (
        <div className="mt-8 rounded-xl bg-panel px-5 py-8 text-center shadow-sm shadow-black/5 ring-1 ring-panel-border">
          <p className="text-sm text-panel-fg/70">
            The trend-breadth and distribution sections need a populated history of daily closes,
            which isn&apos;t available yet. They stay hidden rather than show statistics computed
            from placeholder data.
          </p>
        </div>
      ) : (
        <>
          {/* Trend breadth */}
          <section className="mt-10">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-serif text-lg font-semibold tracking-tight text-panel-fg">
                Trend participation
              </h2>
              {stats.asOf && <span className="text-xs text-panel-fg/65">closes through {stats.asOf}</span>}
            </div>
            <p className="mt-1 max-w-3xl text-sm text-panel-fg/72">
              Share of the {stats.universeSize} largest stocks trading above their own moving
              averages: a classic gauge of how many names are in an uptrend, not just the index.
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Tile label="Above 50-day avg" value={stats.above50Pct == null ? "N/A" : `${stats.above50Pct.toFixed(0)}%`} tone={trendTone(stats.above50Pct)} hint="short-term trend" />
              <Tile label="Above 200-day avg" value={stats.above200Pct == null ? "N/A" : `${stats.above200Pct.toFixed(0)}%`} tone={trendTone(stats.above200Pct)} hint="long-term trend" />
              <Tile
                label="Avg correlation to market"
                value={stats.avgCorrelationToMarket == null ? "N/A" : stats.avgCorrelationToMarket.toFixed(2)}
                hint={cohesionHint(stats.avgCorrelationToMarket)}
              />
              <Tile label="Universe" value={String(stats.universeSize)} hint="largest by market cap" />
            </div>
          </section>

          {/* Cross-sectional distributions */}
          <section className="mt-10">
            <h2 className="font-serif text-lg font-semibold tracking-tight text-panel-fg">
              Cross-sectional distributions
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-panel-fg/72">
              How 1-year return, volatility, and beta are spread across the {stats.universeSize}-stock
              universe. The dashed line marks the median (or beta = 1). Wide spreads mean the
              &ldquo;average stock&rdquo; hides a lot of variation.
            </p>

            <div className="mt-3 grid gap-4 lg:grid-cols-3">
              <DistCard
                title="1-year return"
                dist={stats.distributions.return1y}
                medianLabel={stats.distributions.return1y.median == null ? "" : `median ${pct1(stats.distributions.return1y.median)}`}
                formatX={(x) => `${x >= 0 ? "+" : ""}${x.toFixed(0)}%`}
                colorSplit={0}
                refValue={stats.distributions.return1y.median ?? undefined}
              />
              <DistCard
                title="Annualized volatility"
                dist={stats.distributions.volatility}
                medianLabel={stats.distributions.volatility.median == null ? "" : `median ${stats.distributions.volatility.median.toFixed(0)}%`}
                formatX={(x) => `${x.toFixed(0)}%`}
                refValue={stats.distributions.volatility.median ?? undefined}
              />
              <DistCard
                title="Beta vs market"
                dist={stats.distributions.beta}
                medianLabel="β = 1"
                formatX={(x) => x.toFixed(1)}
                refValue={1}
              />
            </div>
          </section>
        </>
      )}

      <p className="mt-8 max-w-3xl text-xs text-panel-fg/68">
        Breadth covers all {stats.totalTracked} tracked stocks; trend and distribution stats use the
        largest ~{stats.universeSize || 100} by market cap (small, thinly-traded tickers have noisy
        history that distorts a market-wide distribution). Delayed / end-of-day data,
        recomputed by PSEye. Descriptive statistics, not financial advice or a signal.
      </p>
    </div>
  );
}

function DistCard({
  title,
  dist,
  medianLabel,
  formatX,
  colorSplit,
  refValue,
}: {
  title: string;
  dist: Distribution;
  medianLabel: string;
  formatX: (x: number) => string;
  colorSplit?: number;
  refValue?: number;
}) {
  return (
    <div className="rounded-xl bg-panel p-3 shadow-sm shadow-black/5 ring-1 ring-panel-border">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium text-panel-fg">{title}</p>
        <span className="text-[11px] text-panel-fg/65">n = {dist.n}</span>
      </div>
      {dist.bins.length > 1 ? (
        <MarketHistogram bins={dist.bins} formatX={formatX} colorSplit={colorSplit} refValue={refValue} refLabel={medianLabel} />
      ) : (
        <p className="py-8 text-center text-xs text-panel-fg/65">Not enough data.</p>
      )}
    </div>
  );
}

function sharePct(n: number, total: number): string {
  if (total === 0) return "";
  return `${((n / total) * 100).toFixed(0)}% of traded`;
}
function pct2OrDash(n: number | null): string {
  if (n == null) return "N/A";
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}
function toneOf(n: number | null): "up" | "down" | undefined {
  if (n == null) return undefined;
  if (n > 0) return "up";
  if (n < 0) return "down";
  return undefined;
}
function trendTone(pct: number | null): "up" | "down" | undefined {
  if (pct == null) return undefined;
  if (pct >= 55) return "up";
  if (pct <= 45) return "down";
  return undefined;
}
function cohesionHint(corr: number | null): string {
  if (corr == null) return "";
  if (corr >= 0.6) return "moves as one";
  if (corr <= 0.35) return "stock-picker's market";
  return "mixed";
}

function Tile({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
  hint?: string;
}) {
  return (
    <div className="rounded-xl bg-panel p-3 shadow-sm shadow-black/5 ring-1 ring-panel-border">
      <div className="text-[11px] text-panel-fg/68">{label}</div>
      <div
        className={`mt-0.5 text-lg font-semibold tabular-nums ${
          tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-panel-fg"
        }`}
      >
        {value}
      </div>
      {hint && <div className="mt-0.5 text-[10px] text-panel-fg/65">{hint}</div>}
    </div>
  );
}
