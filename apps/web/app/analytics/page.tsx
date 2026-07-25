import type { Metadata } from "next";
import Link from "next/link";
import { getMarketAnalytics, type AnalyticsRow } from "@/lib/marketAnalytics";
import { rsiLabel } from "@/lib/analytics";
import { SectorCorrelationHeatmap } from "@/components/SectorCorrelationHeatmap";

export const revalidate = 3600; // matches the quotes/historical ETL cadence

export const metadata: Metadata = {
  title: "PSE Market Analytics — Volatility, Beta & Sector Correlation",
  description:
    "Quantitative analytics for Philippine Stock Exchange (PSE) stocks: annualized volatility, beta versus a reconstructed market benchmark, 1-year return, RSI, and a sector-by-sector return correlation matrix. Free, no login.",
  alternates: { canonical: "/analytics" },
};

function formatPeso(n: number | null): string {
  if (n == null) return "N/A";
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function pct(n: number | null): string {
  if (n == null) return "—";
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

export default async function AnalyticsPage() {
  const analytics = await getMarketAnalytics();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Market Map", item: siteUrl },
          { "@type": "ListItem", position: 2, name: "Analytics", item: `${siteUrl}/analytics` },
        ],
      },
    ],
  };

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="text-xs text-panel-fg/50">
        <Link href="/" className="hover:underline">
          Market Map
        </Link>
        <span className="mx-1.5">/</span>
        <span>Analytics</span>
      </nav>

      <p className="kicker mt-3 text-accent">Analytics</p>
      <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-panel-fg sm:text-3xl">
        Market Analytics
      </h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-panel-fg/60">
        Risk and behavior metrics computed from about a year of end-of-day closing prices —{" "}
        annualized volatility, beta against a reconstructed market benchmark, trailing return, and
        RSI — plus how the exchange&apos;s sectors move together. Descriptive statistics only, never
        a forecast, stock pick, or buy/sell signal.
      </p>

      {analytics.source !== "real" ? (
        <div className="mt-8 rounded-xl bg-panel px-5 py-8 text-center shadow-sm shadow-black/5 ring-1 ring-panel-border">
          <p className="text-sm text-panel-fg/70">
            Analytics need a populated history of daily closes, which isn&apos;t available in this
            environment yet. Rather than show betas and correlations computed from placeholder data
            (which would be noise dressed up as insight), this page stays empty until real price
            history is on file.
          </p>
        </div>
      ) : (
        <>
          {/* Methodology, collapsed by default — keeps the page honest about what the numbers are. */}
          <details className="mt-4 max-w-3xl rounded-xl bg-panel px-4 py-3 text-sm shadow-sm shadow-black/5 ring-1 ring-panel-border">
            <summary className="cursor-pointer font-medium text-panel-fg">How these are computed</summary>
            <div className="mt-2 flex flex-col gap-2 text-panel-fg/70">
              <p>
                <strong className="text-panel-fg/85">Volatility</strong> is the standard deviation of
                daily log returns, annualized by √252 (trading days/year), as a percent.
              </p>
              <p>
                <strong className="text-panel-fg/85">Beta</strong> is cov(stock, benchmark) /
                var(benchmark) on daily returns. The benchmark (&ldquo;PSEye Composite&rdquo;) is
                reconstructed from the {analytics.benchmarkTickerCount} largest constituents&apos; own
                closes, market-cap-weighted — a proxy, <em>not</em> the official float-adjusted PSEi.
                A beta near 1 means the stock tends to move with the market; above 1, more sharply;
                below 1, more mildly; below 0, opposite.
              </p>
              <p>
                <strong className="text-panel-fg/85">RSI</strong> is Wilder&apos;s 14-day Relative
                Strength Index (0–100; ≤30 oversold, ≥70 overbought).{" "}
                <strong className="text-panel-fg/85">Correlation</strong> is the Pearson correlation
                of two sectors&apos; equal-weighted daily returns.
              </p>
            </div>
          </details>

          {analytics.sectorCorrelation && (
            <section className="mt-8">
              <h2 className="font-serif text-lg font-semibold tracking-tight text-panel-fg">
                Sector return correlation
              </h2>
              <p className="mt-1 max-w-3xl text-sm text-panel-fg/60">
                How closely each pair of PSE sectors&apos; daily returns move together over the window.
                1.00 = move in lockstep, 0 = unrelated, negative = tend to move opposite. Diversifying
                across weakly-correlated sectors is the classic way to cut portfolio swings.
              </p>
              <div className="mt-3 max-w-3xl rounded-xl bg-panel p-4 shadow-sm shadow-black/5 ring-1 ring-panel-border">
                <SectorCorrelationHeatmap data={analytics.sectorCorrelation} />
              </div>
            </section>
          )}

          <section className="mt-10">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="font-serif text-lg font-semibold tracking-tight text-panel-fg">
                Stock analytics leaderboard
              </h2>
              {analytics.asOf && (
                <span className="text-xs text-panel-fg/45">closes through {analytics.asOf}</span>
              )}
            </div>
            <p className="mt-1 max-w-3xl text-sm text-panel-fg/60">
              The {analytics.rows.length} largest stocks by market cap with enough price history.
            </p>
            <div className="mt-3 overflow-x-auto rounded-xl bg-panel shadow-sm shadow-black/5 ring-1 ring-panel-border">
              <table className="w-full min-w-[720px] text-sm">
                <thead>
                  <tr className="border-b border-panel-border text-left text-xs text-panel-fg/55">
                    <th className="px-3 py-2.5 font-medium">Stock</th>
                    <th className="px-3 py-2.5 text-right font-medium">Price</th>
                    <th className="px-3 py-2.5 text-right font-medium">Today</th>
                    <th className="px-3 py-2.5 text-right font-medium">1Y</th>
                    <th className="px-3 py-2.5 text-right font-medium" title="Annualized volatility">
                      Volatility
                    </th>
                    <th className="px-3 py-2.5 text-right font-medium" title="Beta vs PSEye Composite">
                      Beta
                    </th>
                    <th className="px-3 py-2.5 text-right font-medium">RSI</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.rows.map((r) => (
                    <Row key={r.ticker} row={r} />
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      <p className="mt-8 max-w-3xl text-xs text-panel-fg/55">
        Delayed / end-of-day data from PSE Edge, recomputed by PSEye — not real-time and not a
        licensed feed. These are descriptive statistics on past prices, not financial advice, a
        stock pick, or a buy/sell signal.
      </p>
    </div>
  );
}

function Row({ row }: { row: AnalyticsRow }) {
  const rsiTone =
    row.rsi == null ? "" : rsiLabel(row.rsi) === "overbought" ? "text-down" : rsiLabel(row.rsi) === "oversold" ? "text-up" : "text-panel-fg/70";
  return (
    <tr className="border-b border-panel-border/60 last:border-0 hover:bg-panel-raised">
      <td className="px-3 py-2.5">
        <Link href={`/stocks/${row.ticker}`} className="group inline-flex flex-col">
          <span className="font-mono text-xs font-semibold text-panel-fg group-hover:underline">
            {row.ticker}
          </span>
          <span className="max-w-[16rem] truncate text-[11px] text-panel-fg/55">{row.companyName}</span>
        </Link>
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums text-panel-fg/85">{formatPeso(row.price)}</td>
      <td
        className={`px-3 py-2.5 text-right tabular-nums ${
          row.pctChange == null ? "text-panel-fg/40" : row.pctChange >= 0 ? "text-up" : "text-down"
        }`}
      >
        {row.pctChange == null ? "—" : pct(row.pctChange)}
      </td>
      <td
        className={`px-3 py-2.5 text-right tabular-nums ${
          row.return1y == null ? "text-panel-fg/40" : row.return1y >= 0 ? "text-up" : "text-down"
        }`}
      >
        {pct(row.return1y)}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums text-panel-fg/85">
        {row.volatility == null ? "—" : `${row.volatility.toFixed(1)}%`}
      </td>
      <td className="px-3 py-2.5 text-right tabular-nums text-panel-fg/85">
        {row.beta == null ? "—" : row.beta.toFixed(2)}
      </td>
      <td className={`px-3 py-2.5 text-right tabular-nums ${rsiTone}`}>
        {row.rsi == null ? "—" : row.rsi.toFixed(0)}
      </td>
    </tr>
  );
}
