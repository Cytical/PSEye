import { describe, expect, it } from "vitest";
import { computePortfolioHistory, computePortfolioRows } from "./portfolio";
import type { HistoricalClose, Quote } from "@pseye/source-quotes";

function quote(ticker: string, price: number | null, pctChange: number | null = 0): Quote {
  return { ticker, companyName: `${ticker} Corp`, sector: "Financials", price, pctChange, marketCap: 1, freeFloatPct: null };
}

describe("computePortfolioRows", () => {
  it("computes cost/market value and gain/loss per holding and in total", () => {
    const { rows, totalCost, totalValue, totalGainLoss, totalGainLossPct, missingPriceCount } = computePortfolioRows(
      [
        { ticker: "A", shares: 100, avgCost: 10 },
        { ticker: "B", shares: 50, avgCost: 20 },
      ],
      [quote("A", 12), quote("B", 18)]
    );

    expect(rows[0]).toMatchObject({ costValue: 1000, marketValue: 1200, gainLoss: 200, gainLossPct: 20 });
    expect(rows[1]).toMatchObject({ costValue: 1000, marketValue: 900, gainLoss: -100, gainLossPct: -10 });
    expect(totalCost).toBe(2000);
    expect(totalValue).toBe(2100);
    expect(totalGainLoss).toBe(100);
    expect(totalGainLossPct).toBe(5);
    expect(missingPriceCount).toBe(0);
  });

  it("excludes holdings with no current price from totals but still lists them", () => {
    const { rows, totalCost, totalValue, missingPriceCount } = computePortfolioRows(
      [
        { ticker: "A", shares: 10, avgCost: 5 },
        { ticker: "SUSPENDED", shares: 10, avgCost: 5 },
      ],
      [quote("A", 6), quote("SUSPENDED", null)]
    );

    expect(rows).toHaveLength(2);
    expect(rows.find((r) => r.ticker === "SUSPENDED")).toMatchObject({ price: null, marketValue: null, gainLoss: null });
    expect(totalCost).toBe(50);
    expect(totalValue).toBe(60);
    expect(missingPriceCount).toBe(1);
  });

  it("keeps a holding not found in the quote roster visible with a fallback name and null price", () => {
    const { rows } = computePortfolioRows([{ ticker: "ZZZ", shares: 5, avgCost: 1 }], []);
    expect(rows[0]).toMatchObject({ ticker: "ZZZ", companyName: "ZZZ", sector: "Unknown", price: null });
  });

  it("reports null totalGainLossPct when nothing is priced yet (totalCost is 0)", () => {
    const { totalGainLossPct } = computePortfolioRows([{ ticker: "A", shares: 10, avgCost: 5 }], [quote("A", null)]);
    expect(totalGainLossPct).toBeNull();
  });

  it("computes today's dollar/percent change from price and pctChange, distinct from gain/loss vs. avgCost", () => {
    // price 110, pctChange +10% => previousClose 100, so today's move is
    // shares * (110 - 100) regardless of avgCost.
    const { rows, totalDayChange, totalDayChangePct } = computePortfolioRows(
      [{ ticker: "A", shares: 10, avgCost: 50 }],
      [quote("A", 110, 10)]
    );
    expect(rows[0].dayChange).toBeCloseTo(100);
    expect(totalDayChange).toBeCloseTo(100);
    expect(totalDayChangePct).toBeCloseTo(10);
  });

  it("finds the best/worst performer by pctChange and ignores rows that didn't trade", () => {
    const { bestPerformer, worstPerformer } = computePortfolioRows(
      [
        { ticker: "A", shares: 1, avgCost: 1 },
        { ticker: "B", shares: 1, avgCost: 1 },
        { ticker: "SUSPENDED", shares: 1, avgCost: 1 },
      ],
      [quote("A", 10, 5), quote("B", 10, -3), quote("SUSPENDED", null, null)]
    );
    expect(bestPerformer?.ticker).toBe("A");
    expect(worstPerformer?.ticker).toBe("B");
  });

  it("groups priced holdings into sector allocation, sorted by value descending", () => {
    const { sectorAllocation } = computePortfolioRows(
      [
        { ticker: "A", shares: 10, avgCost: 1 },
        { ticker: "B", shares: 10, avgCost: 1 },
      ],
      [
        { ...quote("A", 10), sector: "Financials" },
        { ...quote("B", 30), sector: "Property" },
      ]
    );
    expect(sectorAllocation).toEqual([
      { sector: "Property", value: 300, pct: 75 },
      { sector: "Financials", value: 100, pct: 25 },
    ]);
  });
});

describe("computePortfolioHistory", () => {
  function history(...points: [string, number][]): HistoricalClose[] {
    return points.map(([date, close]) => ({ date, close }));
  }

  it("values current holdings at each shared close date", () => {
    const result = computePortfolioHistory(
      [
        { ticker: "A", shares: 10, avgCost: 1 },
        { ticker: "B", shares: 5, avgCost: 1 },
      ],
      {
        A: history(["2026-01-01", 10], ["2026-01-02", 12]),
        B: history(["2026-01-01", 20], ["2026-01-02", 22]),
      }
    );
    expect(result).toEqual([
      { date: "2026-01-01", value: 200 }, // 10*10 + 5*20
      { date: "2026-01-02", value: 230 }, // 10*12 + 5*22
    ]);
  });

  it("excludes holdings with no history rather than dropping the whole chart", () => {
    const result = computePortfolioHistory(
      [
        { ticker: "A", shares: 10, avgCost: 1 },
        { ticker: "NO_DATA", shares: 5, avgCost: 1 },
      ],
      { A: history(["2026-01-01", 10]) }
    );
    expect(result).toEqual([{ date: "2026-01-01", value: 100 }]);
  });

  it("returns an empty array when no holding has any history", () => {
    expect(computePortfolioHistory([{ ticker: "A", shares: 10, avgCost: 1 }], {})).toEqual([]);
  });
});
