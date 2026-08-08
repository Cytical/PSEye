import type { HistoricalClose, Quote } from "@pseye/source-quotes";

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
  /** shares * (price - previousClose), i.e. today's move on this position — distinct
   * from gainLoss, which is against avgCost. Null whenever pctChange is (no trade
   * today), same nullability contract as the rest of this row. */
  dayChange: number | null;
}

export interface SectorAllocation {
  sector: string;
  /** Sum of marketValue across this sector's priced holdings. */
  value: number;
  /** value / totalValue, as a percentage. */
  pct: number;
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
  /** Sum of dayChange across rows that traded today. Distinct from totalGainLoss:
   * this is today's move, not the move since avgCost. */
  totalDayChange: number;
  /** totalDayChange against yesterday's portfolio value, as a percentage; null when
   * no row traded today (nothing to compare against). */
  totalDayChangePct: number | null;
  /** Row with the highest pctChange today, among rows that traded; null when none did. */
  bestPerformer: PortfolioRow | null;
  /** Row with the lowest pctChange today, among rows that traded; null when none did. */
  worstPerformer: PortfolioRow | null;
  /** Priced holdings grouped by sector and sorted by value, descending — for a
   * quick "am I concentrated in one sector" read. Empty when nothing is priced. */
  sectorAllocation: SectorAllocation[];
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
  let totalDayChange = 0;
  let totalPrevValue = 0;
  let missingPriceCount = 0;

  const rows: PortfolioRow[] = holdings.map((h) => {
    const quote = quoteByTicker.get(h.ticker);
    const price = quote?.price ?? null;
    const pctChange = quote?.pctChange ?? null;
    const costValue = h.shares * h.avgCost;
    const marketValue = price == null ? null : h.shares * price;
    const gainLoss = marketValue == null ? null : marketValue - costValue;
    const gainLossPct = gainLoss == null || costValue === 0 ? null : (gainLoss / costValue) * 100;
    // previousClose derived from price/pctChange rather than stored anywhere — same
    // relationship parseStockData.ts uses to compute pctChange in the first place.
    const previousClose = price != null && pctChange != null ? price / (1 + pctChange / 100) : null;
    const dayChange = previousClose == null ? null : h.shares * (price! - previousClose);

    if (marketValue != null) {
      totalCost += costValue;
      totalValue += marketValue;
    } else {
      missingPriceCount += 1;
    }
    if (dayChange != null) {
      totalDayChange += dayChange;
      totalPrevValue += h.shares * previousClose!;
    }

    return {
      ...h,
      companyName: quote?.companyName ?? h.ticker,
      sector: quote?.sector ?? "Unknown",
      price,
      pctChange,
      costValue,
      marketValue,
      gainLoss,
      gainLossPct,
      dayChange,
    };
  });

  const totalGainLoss = totalValue - totalCost;

  const traded = rows.filter((r) => r.pctChange != null);
  const bestPerformer = traded.reduce<PortfolioRow | null>(
    (best, r) => (best == null || r.pctChange! > best.pctChange! ? r : best),
    null
  );
  const worstPerformer = traded.reduce<PortfolioRow | null>(
    (worst, r) => (worst == null || r.pctChange! < worst.pctChange! ? r : worst),
    null
  );

  const sectorValues = new Map<string, number>();
  for (const r of rows) {
    if (r.marketValue == null) continue;
    sectorValues.set(r.sector, (sectorValues.get(r.sector) ?? 0) + r.marketValue);
  }
  const sectorAllocation: SectorAllocation[] = Array.from(sectorValues, ([sector, value]) => ({
    sector,
    value,
    pct: totalValue > 0 ? (value / totalValue) * 100 : 0,
  })).sort((a, b) => b.value - a.value);

  return {
    rows,
    totalCost,
    totalValue,
    totalGainLoss,
    totalGainLossPct: totalCost > 0 ? (totalGainLoss / totalCost) * 100 : null,
    totalDayChange,
    totalDayChangePct: totalPrevValue > 0 ? (totalDayChange / totalPrevValue) * 100 : null,
    bestPerformer,
    worstPerformer,
    sectorAllocation,
    missingPriceCount,
  };
}

export interface PortfolioHistoryPoint {
  date: string;
  value: number;
}

/**
 * What the CURRENT set of holdings would be worth over time, using real daily
 * closes. This is not a reconstruction of actual past trades (holdings don't
 * record when a position was opened) — it answers "how has what I hold today
 * been moving", the same simplification buildCompositeHistory in dca.ts makes
 * for the market-proxy line. Only dates where every included ticker has a
 * close are used (same shared-dates rule); a holding with no history at all
 * is silently excluded rather than collapsing the whole chart to empty.
 */
export function computePortfolioHistory(
  holdings: Holding[],
  historyByTicker: Record<string, HistoricalClose[]>
): PortfolioHistoryPoint[] {
  const withHistory = holdings.filter((h) => (historyByTicker[h.ticker]?.length ?? 0) > 0);
  if (withHistory.length === 0) return [];

  const closeByDate = withHistory.map((h) => new Map(historyByTicker[h.ticker].map((p) => [p.date, p.close])));
  const sharedDates = historyByTicker[withHistory[0].ticker]
    .map((p) => p.date)
    .filter((date) => closeByDate.every((m) => m.has(date)))
    .sort();

  return sharedDates.map((date) => ({
    date,
    value: withHistory.reduce((sum, h, i) => sum + h.shares * closeByDate[i].get(date)!, 0),
  }));
}
