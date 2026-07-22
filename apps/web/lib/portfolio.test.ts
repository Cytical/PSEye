import { describe, expect, it } from "vitest";
import { computePortfolioRows } from "./portfolio";
import type { Quote } from "@pseye/source-quotes";

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
});
