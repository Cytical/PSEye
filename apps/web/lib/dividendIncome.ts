import type { Holding } from "./portfolio";
import type { DividendScreenerRow } from "./dividends";

export interface DividendIncomeRow {
  ticker: string;
  companyName: string;
  shares: number;
  /** ₱/share trailing-12-month total, from the dividend screener. */
  ttmDividendPerShare: number;
  /** shares * ttmDividendPerShare — projected annual income AT THE CURRENT
   * payout rate, not a guarantee: PSE issuers change dividend rates, and a
   * trailing figure lags a rate cut or raise. */
  projectedAnnualIncome: number;
  nextExDate: string | null;
  /** ₱/share for that next payout, when known. */
  nextAmount: number | null;
  /** shares * nextAmount; null unless both are known. */
  nextPayoutTotal: number | null;
}

export interface DividendIncomeSummary {
  /** Only holdings with at least one parsed dividend on record, sorted by
   * projected annual income descending. */
  rows: DividendIncomeRow[];
  totalProjectedAnnualIncome: number;
  /** totalProjectedAnnualIncome against the market value of just the dividend
   * payers among the holdings (not the whole portfolio) — the portfolio's own
   * effective yield-on-holdings. Null when none of them are priced. */
  portfolioYieldPct: number | null;
}

/**
 * Pure join of current positions onto the dividend screener (lib/dividends.ts,
 * already computed from real corporate-actions data) — no new data source, just
 * a different aggregation of one that already exists for /dividends.
 */
export function computeDividendIncome(
  positions: Holding[],
  dividendRows: DividendScreenerRow[],
  marketValueByTicker: Map<string, number>
): DividendIncomeSummary {
  const dividendByTicker = new Map(dividendRows.map((r) => [r.ticker, r]));
  const rows: DividendIncomeRow[] = [];
  let totalProjectedAnnualIncome = 0;
  let totalDividendPayerValue = 0;

  for (const pos of positions) {
    const div = dividendByTicker.get(pos.ticker);
    if (!div || div.ttmDividend <= 0) continue;

    const projectedAnnualIncome = pos.shares * div.ttmDividend;
    const nextPayoutTotal = div.nextAmount != null ? pos.shares * div.nextAmount : null;

    rows.push({
      ticker: pos.ticker,
      companyName: div.companyName,
      shares: pos.shares,
      ttmDividendPerShare: div.ttmDividend,
      projectedAnnualIncome,
      nextExDate: div.nextExDate,
      nextAmount: div.nextAmount,
      nextPayoutTotal,
    });

    totalProjectedAnnualIncome += projectedAnnualIncome;
    const marketValue = marketValueByTicker.get(pos.ticker);
    if (marketValue != null) totalDividendPayerValue += marketValue;
  }

  rows.sort((a, b) => b.projectedAnnualIncome - a.projectedAnnualIncome);

  return {
    rows,
    totalProjectedAnnualIncome,
    portfolioYieldPct: totalDividendPayerValue > 0 ? (totalProjectedAnnualIncome / totalDividendPayerValue) * 100 : null,
  };
}
