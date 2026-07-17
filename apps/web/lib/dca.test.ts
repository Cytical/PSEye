import { describe, expect, it } from "vitest";
import { buildCompositeHistory, simulateDca } from "./dca";

describe("simulateDca", () => {
  it("returns null for an empty history", () => {
    expect(simulateDca([], { contribution: 1000, frequency: "monthly" })).toBeNull();
  });

  it("contributes once per calendar month and marks the position to each close", () => {
    const history = [
      { date: "2025-01-15", close: 10 },
      { date: "2025-01-20", close: 20 },
      { date: "2025-02-01", close: 25 },
      { date: "2025-02-15", close: 50 },
    ];

    const result = simulateDca(history, { contribution: 1000, frequency: "monthly" });

    expect(result).not.toBeNull();
    expect(result!.totalContributed).toBe(2000);
    expect(result!.totalShares).toBeCloseTo(140, 6); // 1000/10 + 1000/25
    expect(result!.currentValue).toBeCloseTo(7000, 6); // 140 * 50
    expect(result!.returnPct).toBeCloseTo(250, 6); // (7000-2000)/2000*100
    expect(result!.timeline).toEqual([
      { date: "2025-01-15", contributed: 1000, value: 1000 },
      { date: "2025-01-20", contributed: 1000, value: 2000 },
      { date: "2025-02-01", contributed: 2000, value: 3500 },
      { date: "2025-02-15", contributed: 2000, value: 7000 },
    ]);
  });

  it("buckets weekly contributions by ISO week, including across a year boundary", () => {
    // 2025-12-29 (Mon) - 2026-01-04 (Sun) is ISO week 2026-W01 (2026-01-01 is a
    // Thursday, so per ISO 8601 that week's year is 2026 even though most of
    // its days fall in December 2025) — the exact edge case a naive
    // string-slice bucket (unlike the real ISO week calc) would get wrong.
    const history = [
      { date: "2025-12-22", close: 10 }, // ISO 2025-W52
      { date: "2025-12-29", close: 20 }, // ISO 2026-W01
      { date: "2026-01-05", close: 25 }, // ISO 2026-W02
    ];

    const result = simulateDca(history, { contribution: 100, frequency: "weekly" });

    expect(result!.totalContributed).toBe(300);
    expect(result!.totalShares).toBeCloseTo(10 + 5 + 4, 6); // 100/10 + 100/20 + 100/25
    expect(result!.currentValue).toBeCloseTo(19 * 25, 6);
    expect(result!.returnPct).toBeCloseTo((475 - 300) / 300 * 100, 6);
  });

  it("never divides return by zero when contribution is 0", () => {
    const history = [{ date: "2025-01-01", close: 10 }];
    const result = simulateDca(history, { contribution: 0, frequency: "monthly" });
    expect(result!.totalContributed).toBe(0);
    expect(result!.returnPct).toBe(0);
  });
});

describe("buildCompositeHistory", () => {
  it("returns [] when given no histories or all-empty histories", () => {
    expect(buildCompositeHistory([])).toEqual([]);
    expect(buildCompositeHistory([[], []])).toEqual([]);
  });

  it("equal-weights growth across tickers, indexed to 10,000 at the first shared date", () => {
    const tickerA = [
      { date: "2025-01-01", close: 100 },
      { date: "2025-01-02", close: 110 }, // +10%
    ];
    const tickerB = [
      { date: "2025-01-01", close: 50 },
      { date: "2025-01-02", close: 45 }, // -10%
    ];

    const composite = buildCompositeHistory([tickerA, tickerB]);

    expect(composite).toEqual([
      { date: "2025-01-01", close: 10000 },
      { date: "2025-01-02", close: 10000 }, // avg growth (1.1 + 0.9) / 2 = 1.0
    ]);
  });

  it("aligns by date rather than array position when tickers have mismatched date coverage", () => {
    // Regression test: an earlier version zipped series by index, which silently
    // mixed mismatched calendar dates once real per-ticker histories (unlike the
    // old fixed-length mock walk) could have gaps.
    const tickerA = [
      { date: "2025-01-01", close: 100 },
      { date: "2025-01-02", close: 200 }, // no counterpart in tickerB — must be excluded
      { date: "2025-01-03", close: 150 },
    ];
    const tickerB = [
      { date: "2025-01-01", close: 10 },
      { date: "2025-01-03", close: 20 }, // doubled
    ];

    const composite = buildCompositeHistory([tickerA, tickerB]);

    expect(composite.map((p) => p.date)).toEqual(["2025-01-01", "2025-01-03"]);
    // Both tickers double from their first shared date (2025-01-01) to the second
    // shared date (2025-01-03): A 100->150 is +50%, B 10->20 is +100%; avg growth
    // = (1.5 + 2.0) / 2 = 1.75.
    expect(composite[1].close).toBeCloseTo(17500, 6);
  });
});
