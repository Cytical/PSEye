import type { Metadata } from "next";
import Link from "next/link";
import { getStockClusters, type StockCluster } from "@/lib/stockClusters";
import { ClusterScatter, CLUSTER_COLORS, type ScatterPoint } from "@/components/ClusterScatter";

export const revalidate = 21600; // 6h safety-net ceiling; real refresh is on-demand via revalidateTag/revalidatePath from the ETL jobs (see app/api/revalidate/route.ts) — the wall-clock value only kicks in if that call ever fails.

export const metadata: Metadata = {
  title: "PSE Stock Clusters: Grouped by Return Behavior (k-means)",
  description:
    "Philippine Stock Exchange stocks grouped by how they actually behave (volatility, beta, momentum, and correlation to the market) using k-means clustering. See which stocks move alike, beyond their sector labels. Free, no login.",
  alternates: { canonical: "/clusters" },
};

function pct1(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

export default async function ClustersPage() {
  const result = await getStockClusters();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Market Map", item: siteUrl },
          { "@type": "ListItem", position: 2, name: "Stock Clusters", item: `${siteUrl}/clusters` },
        ],
      },
    ],
  };

  const points: ScatterPoint[] = result.clusters.flatMap((c) =>
    c.members.map((m) => ({ ticker: m.ticker, x: m.beta, y: m.volatility, marketCap: m.marketCap, clusterId: c.id }))
  );

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="text-xs text-panel-fg/68">
        <Link href="/" className="hover:underline">
          Market Map
        </Link>
        <span className="mx-1.5">/</span>
        <span>Stock Clusters</span>
      </nav>

      <p className="kicker mt-3 text-accent">Stock Clusters</p>
      <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-panel-fg sm:text-3xl">
        Stocks Grouped by Behavior
      </h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-panel-fg/72">
        Sectors tell you what a company <em>does</em>; this groups stocks by how they actually{" "}
        <em>trade</em>. A k-means model clusters the largest PSE names on four standardized features
        (volatility, beta, 1-year momentum, and correlation to the market), surfacing which stocks
        move alike regardless of industry. Unsupervised and descriptive, not a recommendation.
      </p>

      {result.source !== "real" || result.clusters.length === 0 ? (
        <div className="mt-8 rounded-xl bg-panel px-5 py-8 text-center shadow-sm shadow-black/5 ring-1 ring-panel-border">
          <p className="text-sm text-panel-fg/70">
            Clustering needs a populated history of daily closes, which isn&apos;t available in this
            environment yet. The page stays empty rather than cluster placeholder data.
          </p>
        </div>
      ) : (
        <>
          <details className="mt-4 max-w-3xl rounded-xl bg-panel px-4 py-3 text-sm shadow-sm shadow-black/5 ring-1 ring-panel-border">
            <summary className="cursor-pointer font-medium text-panel-fg">How the clustering works</summary>
            <div className="mt-2 flex flex-col gap-2 text-panel-fg/70">
              <p>
                Each stock becomes a point in {result.featureCount}-dimensional space (volatility,
                beta, momentum, correlation). Features are z-scored so none dominates by scale, then{" "}
                <strong className="text-panel-fg/85">k-means</strong> partitions them into{" "}
                {result.clusters.length} groups by minimizing within-group distance. Each cluster is
                auto-labeled from its centroid&apos;s most extreme traits.
              </p>
              <p>
                The model is seeded deterministically, so the same closing prices always yield the
                same clusters. {result.asOf ? `Closes through ${result.asOf}.` : ""}
              </p>
            </div>
          </details>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <div className="rounded-xl bg-panel p-4 shadow-sm shadow-black/5 ring-1 ring-panel-border">
              <ClusterScatter points={points} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-panel-fg">Clusters</h2>
              <ul className="mt-2 flex flex-col gap-2">
                {result.clusters.map((c) => (
                  <li key={c.id} className="flex items-center gap-2 text-sm">
                    <span
                      className="inline-block h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: CLUSTER_COLORS[c.id % CLUSTER_COLORS.length] }}
                      aria-hidden="true"
                    />
                    <span className="font-medium text-panel-fg">{c.label}</span>
                    <span className="text-panel-fg/68">· {c.size} stocks</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-panel-fg/68">
                Point size ∝ market cap; the dashed line marks beta = 1 (moves with the market).
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {result.clusters.map((c) => (
              <ClusterCard key={c.id} cluster={c} />
            ))}
          </div>
        </>
      )}

      <p className="mt-8 max-w-3xl text-xs text-panel-fg/68">
        Computed over the largest ~100 PSE stocks with sufficient history. Delayed / end-of-day data,
        recomputed by PSEye. Descriptive statistics and unsupervised grouping, not
        financial advice, a stock pick, or a buy/sell signal.
      </p>
    </div>
  );
}

function ClusterCard({ cluster }: { cluster: StockCluster }) {
  const MAX_SHOWN = 18;
  const shown = cluster.members.slice(0, MAX_SHOWN);
  const rest = cluster.size - shown.length;
  return (
    <div className="rounded-xl bg-panel p-4 shadow-sm shadow-black/5 ring-1 ring-panel-border">
      <div className="flex items-center gap-2">
        <span
          className="inline-block h-3 w-3 shrink-0 rounded-full"
          style={{ backgroundColor: CLUSTER_COLORS[cluster.id % CLUSTER_COLORS.length] }}
          aria-hidden="true"
        />
        <h3 className="font-serif text-base font-semibold text-panel-fg">{cluster.label}</h3>
        <span className="ml-auto text-xs text-panel-fg/68">{cluster.size} stocks</span>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-2 text-center">
        <MiniStat label="Volatility" value={`${cluster.avgVolatility.toFixed(0)}%`} />
        <MiniStat label="Beta" value={cluster.avgBeta.toFixed(2)} />
        <MiniStat label="1Y return" value={pct1(cluster.avgMomentum)} tone={cluster.avgMomentum >= 0 ? "up" : "down"} />
        <MiniStat label="Corr." value={cluster.avgCorrelation.toFixed(2)} />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {shown.map((m) => (
          <Link
            key={m.ticker}
            href={`/stocks/${m.ticker}`}
            title={m.companyName}
            className="rounded-md bg-panel-raised px-2 py-1 font-mono text-[11px] font-semibold text-panel-fg/80 hover:text-panel-fg"
          >
            {m.ticker}
          </Link>
        ))}
        {rest > 0 && <span className="px-1 py-1 text-[11px] text-panel-fg/65">+{rest} more</span>}
      </div>
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  return (
    <div>
      <div className="text-[10px] text-panel-fg/68">{label}</div>
      <div className={`text-sm font-semibold tabular-nums ${tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-panel-fg"}`}>
        {value}
      </div>
    </div>
  );
}
