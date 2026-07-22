import type { Quote } from "@pseye/source-quotes";

/** One localStorage-persisted position: ticker + shares held + average cost per share, ₱. */
export interface Holding {
  ticker: string;
  shares: number;
  avgCost: number;
}

export interface PortfolioRow extends Holding {
  companyName: string;
  sector: string;
  /** null mirrors Quote.price — no trade to report, render "N/A", never 0. */
  price: number | null;
  pctChange: number | null;
  costValue: number;
  /** shares * price; null when price is null. */
  marketValue: number | null;
  /** marketValue - costValue; null when marketValue is null. */
  gainLoss: number | null;
  /** gainLoss / costValue, as a percentage; null when gainLoss is null or costValue is 0. */
  gainLossPct: number | null;
}

export interface PortfolioSummary {
  rows: PortfolioRow[];
  /** Sum of costValue across rows with a known price — excludes priceless rows so it
   * stays comparable to totalValue below rather than mixing in unpriced cost. */
  totalCost: number;
  /** Sum of marketValue across rows with a known price. */
  totalValue: number;
  totalGainLoss: number;
  /** totalGainLoss / totalCost, as a percentage; null when totalCost is 0 (nothing priced yet). */
  totalGainLossPct: number | null;
  /** How many holdings were excluded from the totals above for lack of a current price
   * (suspended ticker, no trade yet today) — reported rather than silently dropped. */
  missingPriceCount: number;
}

/**
 * Pure join of localStorage holdings onto the live quote roster — same
 * build-then-get split as rankings.ts/screener.ts, so the math is unit-testable
 * without touching localStorage or the DB. A holding whose ticker isn't (or
 * is no longer) in the quote roster still renders with its own ticker as a
 * fallback name and a null price, rather than being silently dropped — the
 * user typed it in and money is tracked against it, so it must stay visible.
 */
export function computePortfolioRows(holdings: Holding[], quotes: Quote[]): PortfolioSummary {
  const quoteByTicker = new Map(quotes.map((q) => [q.ticker, q]));

  let totalCost = 0;
  let totalValue = 0;
  let missingPriceCount = 0;

  const rows: PortfolioRow[] = holdings.map((h) => {
    const quote = quoteByTicker.get(h.ticker);
    const price = quote?.price ?? null;
    const costValue = h.shares * h.avgCost;
    const marketValue = price == null ? null : h.shares * price;
    const gainLoss = marketValue == null ? null : marketValue - costValue;
    const gainLossPct = gainLoss == null || costValue === 0 ? null : (gainLoss / costValue) * 100;

    if (marketValue != null) {
      totalCost += costValue;
      totalValue += marketValue;
    } else {
      missingPriceCount += 1;
    }

    return {
      ...h,
      companyName: quote?.companyName ?? h.ticker,
      sector: quote?.sector ?? "Unknown",
      price,
      pctChange: quote?.pctChange ?? null,
      costValue,
      marketValue,
      gainLoss,
      gainLossPct,
    };
  });

  const totalGainLoss = totalValue - totalCost;

  return {
    rows,
    totalCost,
    totalValue,
    totalGainLoss,
    totalGainLossPct: totalCost > 0 ? (totalGainLoss / totalCost) * 100 : null,
    missingPriceCount,
  };
}
