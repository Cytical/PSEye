import { annualizedVolatility, beta, correlation, trailingReturn } from "./analytics";
import { alignByDate, datedReturns } from "./marketBenchmark";
import { loadUniverse } from "./marketUniverse";
import { kmeans, standardizeColumns } from "./clustering";

/**
 * Server-only. Unsupervised grouping of PSE stocks by RETURN BEHAVIOR (not
 * sector) via k-means on four standardized features:
 *   volatility · beta · 1-year momentum · correlation to the market.
 * Each cluster is auto-characterized from its standardized centroid (e.g.
 * "High-beta, high-volatility" or "Defensive, low-correlation"), turning the
 * raw centroid into a plain-language label. Deterministic (fixed-seed k-means)
 * so the same data always produces the same clusters across ISR revalidations.
 */

const K = 5;
const FEATURES = ["volatility", "beta", "momentum", "correlation"] as const;

export interface ClusterMember {
  ticker: string;
  companyName: string;
  sector: string;
  marketCap: number;
  price: number | null;
  pctChange: number | null;
  volatility: number;
  beta: number;
  momentum: number;
  correlation: number;
}

export interface StockCluster {
  id: number;
  label: string;
  size: number;
  avgVolatility: number;
  avgBeta: number;
  avgMomentum: number;
  avgCorrelation: number;
  members: ClusterMember[];
}

export interface StockClustersResult {
  source: "real" | "mock";
  asOf: string | null;
  featureCount: number;
  clusters: StockCluster[];
}

export async function getStockClusters(): Promise<StockClustersResult> {
  const { source, universe, history, benchmark, asOf } = await loadUniverse({ size: 120, minCloses: 90 });
  if (source !== "real") {
    return { source: "mock", asOf: null, featureCount: FEATURES.length, clusters: [] };
  }

  // Build one feature row per stock; keep only stocks with all four features.
  const members: Omit<ClusterMember, never>[] = [];
  const rows: number[][] = [];
  for (const q of universe) {
    const closes = history[q.ticker].map((c) => c.close);
    const vol = annualizedVolatility(closes);
    const momentum = trailingReturn(closes, 251);
    const stockReturns = new Map(datedReturns(history[q.ticker]).map((r) => [r.date, r.ret]));
    const aligned = alignByDate(stockReturns, benchmark);
    const b = beta(aligned.a, aligned.b);
    const c = correlation(aligned.a, aligned.b);
    if (vol == null || momentum == null || b == null || c == null) continue;

    members.push({
      ticker: q.ticker,
      companyName: q.companyName,
      sector: q.sector,
      marketCap: q.marketCap,
      price: q.price,
      pctChange: q.pctChange,
      volatility: vol,
      beta: b,
      momentum,
      correlation: c,
    });
    rows.push([vol, b, momentum, c]);
  }

  if (members.length < K + 1) {
    return { source: "mock", asOf, featureCount: FEATURES.length, clusters: [] };
  }

  const { standardized } = standardizeColumns(rows);
  const { assignments, centroids } = kmeans(standardized, K, { seed: 42 });

  const clusters: StockCluster[] = [];
  for (let id = 0; id < K; id++) {
    const idxs = assignments.map((a, i) => (a === id ? i : -1)).filter((i) => i >= 0);
    if (idxs.length === 0) continue;
    const clusterMembers = idxs
      .map((i) => members[i])
      .sort((a, b) => b.marketCap - a.marketCap);

    clusters.push({
      id,
      label: characterize(centroids[id]),
      size: clusterMembers.length,
      avgVolatility: avg(clusterMembers.map((m) => m.volatility)),
      avgBeta: avg(clusterMembers.map((m) => m.beta)),
      avgMomentum: avg(clusterMembers.map((m) => m.momentum)),
      avgCorrelation: avg(clusterMembers.map((m) => m.correlation)),
      members: clusterMembers,
    });
  }

  clusters.sort((a, b) => b.size - a.size);
  return { source: "real", asOf, featureCount: FEATURES.length, clusters };
}

/**
 * Turn a standardized centroid [zVol, zBeta, zMomentum, zCorr] into a short
 * plain-language label from its most extreme features (|z| ≥ 0.5). Falls back
 * to "Middle-of-the-market" when nothing stands out.
 */
function characterize(centroid: number[]): string {
  const [zVol, zBeta, zMom, zCorr] = centroid;
  const traits: { z: number; hi: string; lo: string }[] = [
    { z: zVol, hi: "high-volatility", lo: "low-volatility" },
    { z: zBeta, hi: "high-beta", lo: "defensive" },
    { z: zMom, hi: "strong-momentum", lo: "lagging" },
    { z: zCorr, hi: "market-tracking", lo: "idiosyncratic" },
  ];

  const strong = traits
    .filter((t) => Math.abs(t.z) >= 0.5)
    .sort((a, b) => Math.abs(b.z) - Math.abs(a.z))
    .slice(0, 2)
    .map((t) => (t.z > 0 ? t.hi : t.lo));

  if (strong.length === 0) return "Middle-of-the-market";
  const [first, ...rest] = strong;
  const capital = first.charAt(0).toUpperCase() + first.slice(1);
  return [capital, ...rest].join(", ");
}

function avg(xs: number[]): number {
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}
