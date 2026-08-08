import type { HistoricalClose } from "@pseye/source-quotes";
import type { PortfolioHistoryPoint } from "./portfolio";

export interface BenchmarkPoint {
  date: string;
  portfolioReturnPct: number;
  benchmarkReturnPct: number;
}

/**
 * Portfolio value history and the PSEi composite proxy (buildCompositeHistory
 * in dca.ts, the same equal-weighted "invest across the whole market" line the
 * DCA calculator plots) will rarely share every date — different holdings,
 * different start dates — so both series are re-based to 0% at the first date
 * they DO share, then compared as cumulative % return from there onward. An
 * absolute-₱ comparison would be meaningless: the composite is a base-10000
 * index, not a ₱ amount. Dates missing from either series are dropped rather
 * than interpolated.
 */
export function alignPortfolioToBenchmark(
  portfolio: PortfolioHistoryPoint[],
  benchmark: HistoricalClose[]
): BenchmarkPoint[] {
  const benchByDate = new Map(benchmark.map((p) => [p.date, p.close]));
  const shared = portfolio.filter((p) => benchByDate.has(p.date));
  if (shared.length === 0) return [];

  const baseValue = shared[0].value;
  const baseBench = benchByDate.get(shared[0].date)!;
  if (baseValue <= 0 || baseBench <= 0) return [];

  return shared.map((p) => ({
    date: p.date,
    portfolioReturnPct: (p.value / baseValue - 1) * 100,
    benchmarkReturnPct: (benchByDate.get(p.date)! / baseBench - 1) * 100,
  }));
}
