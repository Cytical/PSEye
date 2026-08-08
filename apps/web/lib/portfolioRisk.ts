import type { HistoricalClose } from "@pseye/source-quotes";
import { alignedReturns, beta as betaOf, correlation as correlationOf } from "./analytics";

export interface PortfolioBetaInput {
  ticker: string;
  marketValue: number;
  closes: HistoricalClose[];
}

/**
 * Portfolio beta: market-value-weighted average of each holding's own beta
 * against the benchmark (see analytics.ts's `beta`/`alignedReturns`). A
 * holding with too little shared history to compute a beta is excluded from
 * both the weighted sum AND the weight total, not treated as beta=0 — a
 * thinly-traded holding shouldn't silently drag the portfolio beta toward
 * zero just because its own beta is unknown. Returns null if none qualify.
 */
export function computePortfolioBeta(holdings: PortfolioBetaInput[], benchmark: HistoricalClose[]): number | null {
  let weightedSum = 0;
  let totalWeight = 0;
  for (const h of holdings) {
    if (h.marketValue <= 0) continue;
    const { a, b } = alignedReturns(h.closes, benchmark);
    const holdingBeta = betaOf(a, b);
    if (holdingBeta == null) continue;
    weightedSum += holdingBeta * h.marketValue;
    totalWeight += h.marketValue;
  }
  return totalWeight > 0 ? weightedSum / totalWeight : null;
}

export interface HoldingsCorrelation {
  tickers: string[];
  /** matrix[i][j] = correlation between tickers[i] and tickers[j]'s daily
   * returns; diagonal is always 1 (a series against itself, not computed). */
  matrix: (number | null)[][];
}

/**
 * Pairwise correlation of daily returns between every pair of holdings — a
 * quick "am I actually diversified" read that sector alone can't give: two
 * stocks in different PSE sectors can still move in near lockstep. Reuses
 * analytics.ts's `alignedReturns`/`correlation`, same as the sector-level
 * heatmap on /analytics, just over this portfolio's own holdings instead of
 * sector baskets.
 */
export function computeHoldingsCorrelation(holdings: { ticker: string; closes: HistoricalClose[] }[]): HoldingsCorrelation {
  const tickers = holdings.map((h) => h.ticker);
  const matrix: (number | null)[][] = holdings.map((rowH, i) =>
    holdings.map((colH, j) => {
      if (i === j) return 1;
      const { a, b } = alignedReturns(rowH.closes, colH.closes);
      return correlationOf(a, b);
    })
  );
  return { tickers, matrix };
}
