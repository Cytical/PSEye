import { describe, expect, it } from "vitest";
import { buildDividendScreener, parseDividendAmount, type CashDividendInput } from "./dividends";
import type { Quote } from "@pseye/source-quotes";

describe("parseDividendAmount", () => {
  // Every format observed live in the backfilled corporate_actions table.
  it.each([
    ["P0.35/share", 0.35],
    ["Php1.00", 1.0],
    ["Php 0.042114 per share", 0.042114],
    ["Php0.01092299", 0.01092299],
    ["1.40", 1.4],
    [".45", 0.45],
    ["P1.20/share cash dividend", 1.2],
    ["Php 1,000.50", 1000.5],
  ])("parses %j as %d", (details, expected) => {
    expect(parseDividendAmount(details)).toBe(expected);
  });

  it("rejects preferred-series rates (parenthesized security suffix)", () => {
    expect(parseDividendAmount("Php12.73725 (GTPPB)")).toBeNull();
    expect(parseDividendAmount("Php 2.0625 per share (BDOPM Series B)")).toBeNull();
  });

  it("rejects USD-denominated and percent-of-par rates", () => {
    expect(parseDividendAmount("US$0.011")).toBeNull();
    expect(parseDividendAmount("USD 0.05 per share")).toBeNull();
    expect(parseDividendAmount("5% of par value")).toBeNull();
  });

  it("rejects rates with no number at all", () => {
    expect(parseDividendAmount("TBA")).toBeNull();
  });
});

function quote(ticker: string, price: number | null): Quote {
  return { ticker, companyName: `${ticker} Corp`, sector: "Financials", price, pctChange: 0, marketCap: 1 };
}

function div(ticker: string, exDate: string, details: string): CashDividendInput {
  return { ticker, exDate, paymentDate: null, details };
}

const TODAY = "2026-07-20";

describe("buildDividendScreener", () => {
  it("sums trailing-12-month payouts and computes yield against the current price", () => {
    const rows = buildDividendScreener(
      [quote("BDO", 100)],
      [div("BDO", "2025-10-01", "P2.00"), div("BDO", "2026-04-01", "P3.00")],
      TODAY
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].ttmDividend).toBe(5);
    expect(rows[0].payoutCount).toBe(2);
    expect(rows[0].yieldPct).toBeCloseTo(5);
    expect(rows[0].nextExDate).toBeNull();
  });

  it("excludes payouts older than 12 months from the total", () => {
    const rows = buildDividendScreener(
      [quote("BDO", 100)],
      [div("BDO", "2025-06-01", "P9.00"), div("BDO", "2026-04-01", "P1.00")],
      TODAY
    );
    expect(rows[0].ttmDividend).toBe(1);
    expect(rows[0].payoutCount).toBe(1);
  });

  it("surfaces the soonest upcoming ex-date and its amount", () => {
    const rows = buildDividendScreener(
      [quote("AC", 500)],
      [div("AC", "2026-08-15", "Php4.60"), div("AC", "2026-11-15", "Php4.80"), div("AC", "2026-02-01", "Php4.40")],
      TODAY
    );
    expect(rows[0].nextExDate).toBe("2026-08-15");
    expect(rows[0].nextAmount).toBe(4.6);
    expect(rows[0].ttmDividend).toBe(4.4);
  });

  it("keeps an upcoming-only payer but with null yield, sorted after yielding rows", () => {
    const rows = buildDividendScreener(
      [quote("NEW", 10), quote("OLD", 10)],
      [div("NEW", "2026-09-01", "P0.50"), div("OLD", "2026-01-01", "P0.10")],
      TODAY
    );
    expect(rows.map((r) => r.ticker)).toEqual(["OLD", "NEW"]);
    expect(rows[1].yieldPct).toBeNull();
    expect(rows[1].nextExDate).toBe("2026-09-01");
  });

  it("yields null (not Infinity) when the price is N/A", () => {
    const rows = buildDividendScreener([quote("SUS", null)], [div("SUS", "2026-05-01", "P1.00")], TODAY);
    expect(rows[0].yieldPct).toBeNull();
    expect(rows[0].ttmDividend).toBe(1);
  });

  it("drops tickers not in the quote roster and companies with only unparseable payouts", () => {
    const rows = buildDividendScreener(
      [quote("BDO", 100)],
      [div("GHOST", "2026-05-01", "P1.00"), div("BDO", "2026-05-01", "Php2.0625 (BDOPM Series B)")],
      TODAY
    );
    expect(rows).toHaveLength(0);
  });

  it("sorts by yield descending by default", () => {
    const rows = buildDividendScreener(
      [quote("LOW", 100), quote("HIGH", 100)],
      [div("LOW", "2026-05-01", "P1.00"), div("HIGH", "2026-05-01", "P8.00")],
      TODAY
    );
    expect(rows.map((r) => r.ticker)).toEqual(["HIGH", "LOW"]);
  });
});
