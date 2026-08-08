import { describe, expect, it } from "vitest";
import { computeDividendIncome } from "./dividendIncome";
import type { DividendScreenerRow } from "./dividends";

function dividendRow(overrides: Partial<DividendScreenerRow> & Pick<DividendScreenerRow, "ticker">): DividendScreenerRow {
  return {
    companyName: `${overrides.ticker} Corp`,
    sector: "Financials",
    price: 100,
    ttmDividend: 0,
    yieldPct: null,
    payoutCount: 0,
    nextExDate: null,
    nextAmount: null,
    ...overrides,
  };
}

describe("computeDividendIncome", () => {
  it("projects annual income as shares times trailing-12-month dividend per share", () => {
    const { rows, totalProjectedAnnualIncome } = computeDividendIncome(
      [{ ticker: "BDO", shares: 100, avgCost: 100 }],
      [dividendRow({ ticker: "BDO", ttmDividend: 5 })],
      new Map([["BDO", 12000]])
    );
    expect(rows[0]).toMatchObject({ ticker: "BDO", projectedAnnualIncome: 500 });
    expect(totalProjectedAnnualIncome).toBe(500);
  });

  it("excludes holdings with no dividend history from rows and totals", () => {
    const { rows } = computeDividendIncome(
      [
        { ticker: "BDO", shares: 100, avgCost: 100 },
        { ticker: "NODIV", shares: 50, avgCost: 10 },
      ],
      [dividendRow({ ticker: "BDO", ttmDividend: 5 }), dividendRow({ ticker: "NODIV", ttmDividend: 0 })],
      new Map()
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].ticker).toBe("BDO");
  });

  it("computes portfolio yield against only the dividend payers' market value", () => {
    const { portfolioYieldPct } = computeDividendIncome(
      [
        { ticker: "BDO", shares: 100, avgCost: 100 },
        { ticker: "NODIV", shares: 50, avgCost: 10 },
      ],
      [dividendRow({ ticker: "BDO", ttmDividend: 5 })],
      new Map([
        ["BDO", 10000],
        ["NODIV", 5000],
      ])
    );
    // 500 income / 10000 BDO value only, NODIV's 5000 excluded.
    expect(portfolioYieldPct).toBe(5);
  });

  it("carries the next payout amount and total when known", () => {
    const { rows } = computeDividendIncome(
      [{ ticker: "BDO", shares: 100, avgCost: 100 }],
      [dividendRow({ ticker: "BDO", ttmDividend: 5, nextExDate: "2026-09-01", nextAmount: 2.5 })],
      new Map()
    );
    expect(rows[0]).toMatchObject({ nextExDate: "2026-09-01", nextAmount: 2.5, nextPayoutTotal: 250 });
  });

  it("sorts rows by projected annual income descending", () => {
    const { rows } = computeDividendIncome(
      [
        { ticker: "SMALL", shares: 10, avgCost: 1 },
        { ticker: "BIG", shares: 1000, avgCost: 1 },
      ],
      [dividendRow({ ticker: "SMALL", ttmDividend: 1 }), dividendRow({ ticker: "BIG", ttmDividend: 1 })],
      new Map()
    );
    expect(rows.map((r) => r.ticker)).toEqual(["BIG", "SMALL"]);
  });
});
