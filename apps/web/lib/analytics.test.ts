import { describe, expect, it } from "vitest";
import {
  alignedReturns,
  annualizedReturn,
  annualizedVolatility,
  beta,
  correlation,
  dailyReturns,
  downsideDeviation,
  excessKurtosis,
  histogram,
  historicalVaR,
  logReturns,
  maxDrawdown,
  mean,
  monthlyReturnStats,
  percentile,
  positiveDayRatio,
  rsi,
  rsiLabel,
  sharpeRatio,
  skewness,
  sma,
  sortinoRatio,
  stdev,
  toDailyRate,
  TRADING_DAYS_PER_YEAR,
  trailingReturn,
} from "./analytics";

describe("dailyReturns", () => {
  it("computes simple returns and skips non-positive prior closes", () => {
    expect(dailyReturns([100, 110, 99])).toEqual([expect.closeTo(0.1, 10), expect.closeTo(-0.1, 10)]);
    // A zero prior close is skipped rather than producing Infinity.
    expect(dailyReturns([0, 10, 20])).toEqual([1]);
  });
  it("returns empty for a single close", () => {
    expect(dailyReturns([100])).toEqual([]);
  });
});

describe("logReturns", () => {
  it("matches ln(cur/prev)", () => {
    const r = logReturns([100, 200]);
    expect(r).toHaveLength(1);
    expect(r[0]).toBeCloseTo(Math.log(2), 10);
  });
});

describe("stdev", () => {
  it("is the sample (n-1) standard deviation", () => {
    // variance of [2,4,4,4,5,5,7,9] with n-1 is 4, so stdev is 2.
    expect(stdev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 2);
  });
  it("is NaN with fewer than two points", () => {
    expect(Number.isNaN(stdev([1]))).toBe(true);
  });
});

describe("annualizedVolatility", () => {
  it("is null when there are too few returns", () => {
    expect(annualizedVolatility([100, 101, 102], 20)).toBeNull();
  });
  it("scales daily stdev by sqrt(252) and returns a percentage", () => {
    // Constant +1% every day → zero return variance → 0% volatility.
    const flat = Array.from({ length: 30 }, (_, i) => 100 * 1.01 ** i);
    expect(annualizedVolatility(flat, 20)).toBeCloseTo(0, 6);
  });
});

describe("sma", () => {
  it("averages the last `window` closes", () => {
    expect(sma([1, 2, 3, 4, 5], 3)).toBeCloseTo(4, 10); // (3+4+5)/3
  });
  it("is null when there are fewer closes than the window", () => {
    expect(sma([1, 2], 5)).toBeNull();
  });
});

describe("rsi", () => {
  it("is null below period+1 closes", () => {
    expect(rsi([1, 2, 3], 14)).toBeNull();
  });
  it("is 100 for a strictly rising series (no losses)", () => {
    const rising = Array.from({ length: 20 }, (_, i) => 100 + i);
    expect(rsi(rising, 14)).toBe(100);
  });
  it("is near 50 for a symmetric up/down oscillation", () => {
    const zig: number[] = [100];
    for (let i = 0; i < 30; i++) zig.push(zig[zig.length - 1] + (i % 2 === 0 ? 1 : -1));
    const value = rsi(zig, 14)!;
    expect(value).toBeGreaterThan(30);
    expect(value).toBeLessThan(70);
  });
});

describe("maxDrawdown", () => {
  it("is 0 for a non-decreasing series", () => {
    expect(maxDrawdown([1, 2, 3, 4])).toBe(0);
  });
  it("captures the worst peak-to-trough drop as a negative percent", () => {
    // Peak 100 → trough 60 is −40%, even though it recovers to 90 after.
    expect(maxDrawdown([100, 80, 60, 90])).toBeCloseTo(-40, 6);
  });
});

describe("trailingReturn", () => {
  it("compares the last close to the one `days` rows back", () => {
    expect(trailingReturn([100, 110, 120, 132], 3)).toBeCloseTo(32, 6); // 132 vs 100
  });
  it("is null when the series is too short", () => {
    expect(trailingReturn([100, 110], 5)).toBeNull();
  });
});

describe("correlation", () => {
  it("is 1 for perfectly co-moving series", () => {
    expect(correlation([1, 2, 3, 4], [2, 4, 6, 8])).toBeCloseTo(1, 10);
  });
  it("is -1 for perfectly anti-correlated series", () => {
    expect(correlation([1, 2, 3, 4], [4, 3, 2, 1])).toBeCloseTo(-1, 10);
  });
  it("is null for a constant series (undefined correlation)", () => {
    expect(correlation([1, 1, 1, 1], [1, 2, 3, 4])).toBeNull();
  });
});

describe("beta", () => {
  it("is 1 when the stock equals the market", () => {
    const m = [0.01, -0.02, 0.03, -0.01];
    expect(beta(m, m)).toBeCloseTo(1, 10);
  });
  it("is 2 when the stock moves twice the market", () => {
    const m = [0.01, -0.02, 0.03, -0.01];
    const s = m.map((x) => 2 * x);
    expect(beta(s, m)).toBeCloseTo(2, 10);
  });
  it("is null when the market has no variance", () => {
    expect(beta([0.01, 0.02], [0.0, 0.0])).toBeNull();
  });
});

describe("alignedReturns", () => {
  it("intersects on shared dates before differencing", () => {
    const a = [
      { date: "2025-01-01", close: 100 },
      { date: "2025-01-02", close: 110 }, // no match in b
      { date: "2025-01-03", close: 121 },
    ];
    const b = [
      { date: "2025-01-01", close: 50 },
      { date: "2025-01-03", close: 55 },
    ];
    const { a: ra, b: rb } = alignedReturns(a, b);
    // Only 01-01 and 01-03 are shared → one aligned return each.
    expect(ra).toHaveLength(1);
    expect(rb).toHaveLength(1);
    expect(ra[0]).toBeCloseTo(0.21, 10); // 121/100 - 1
    expect(rb[0]).toBeCloseTo(0.1, 10); // 55/50 - 1
  });
});

describe("rsiLabel", () => {
  it("bands at 30/70", () => {
    expect(rsiLabel(20)).toBe("oversold");
    expect(rsiLabel(50)).toBe("neutral");
    expect(rsiLabel(80)).toBe("overbought");
  });
});

describe("toDailyRate", () => {
  it("compounds back to the annual rate over 252 days", () => {
    const daily = toDailyRate(0.0575);
    expect((1 + daily) ** TRADING_DAYS_PER_YEAR - 1).toBeCloseTo(0.0575, 10);
  });
});

describe("annualizedReturn", () => {
  it("annualizes a full-year doubling to ~100%", () => {
    // 253 closes = 252 steps; doubling over exactly a trading year → +100%.
    const closes = Array.from({ length: 253 }, (_, i) => 100 * 2 ** (i / 252));
    expect(annualizedReturn(closes)!).toBeCloseTo(100, 4);
  });
  it("is null for a single close", () => {
    expect(annualizedReturn([100])).toBeNull();
  });
});

describe("downsideDeviation", () => {
  it("ignores upside and RMSes the downside vs the target", () => {
    // returns [-0.1, 0.2, -0.3] vs mar 0 → sqrt((0.01+0+0.09)/3)
    expect(downsideDeviation([-0.1, 0.2, -0.3], 0)!).toBeCloseTo(Math.sqrt(0.1 / 3), 10);
  });
  it("is zero when nothing is below the target", () => {
    expect(downsideDeviation([0.01, 0.02, 0.03], 0)).toBe(0);
  });
});

describe("sharpeRatio / sortinoRatio", () => {
  it("Sharpe scales excess mean by stdev and √252", () => {
    const r = [0.01, -0.01, 0.02, -0.02, 0.015];
    const expected = (mean(r) / stdev(r)) * Math.sqrt(TRADING_DAYS_PER_YEAR);
    expect(sharpeRatio(r, 0)!).toBeCloseTo(expected, 10);
  });
  it("Sortino exceeds Sharpe when upside vol is large (downside vol is smaller)", () => {
    const r = [0.05, 0.06, -0.01, 0.04, -0.005];
    expect(sortinoRatio(r, 0)!).toBeGreaterThan(sharpeRatio(r, 0)!);
  });
  it("is null when volatility is zero", () => {
    expect(sharpeRatio([0.01, 0.01, 0.01], 0)).toBeNull();
  });
});

describe("skewness", () => {
  it("is ~0 for a symmetric sample", () => {
    expect(skewness([-2, -1, 0, 1, 2])!).toBeCloseTo(0, 10);
  });
  it("is positive for a right-tailed sample", () => {
    expect(skewness([1, 1, 1, 1, 10])!).toBeGreaterThan(0);
  });
});

describe("excessKurtosis", () => {
  it("is positive (fat-tailed) for a spiked sample with outliers", () => {
    expect(excessKurtosis([0, 0, 0, 0, 0, 0, 0, 10, -10])!).toBeGreaterThan(0);
  });
  it("is null below four points", () => {
    expect(excessKurtosis([1, 2, 3])).toBeNull();
  });
});

describe("percentile", () => {
  it("interpolates linearly", () => {
    expect(percentile([1, 2, 3, 4], 50)).toBeCloseTo(2.5, 10); // median
    expect(percentile([1, 2, 3, 4], 0)).toBe(1);
    expect(percentile([1, 2, 3, 4], 100)).toBe(4);
  });
});

describe("historicalVaR", () => {
  it("reports the lower-tail loss as a positive percent", () => {
    // 100 returns from -0.10..+0.89; the 5th percentile is around -0.05 → VaR ~5%.
    const returns = Array.from({ length: 100 }, (_, i) => (i - 10) / 100);
    const var95 = historicalVaR(returns, 0.95)!;
    expect(var95).toBeGreaterThan(0);
    expect(var95).toBeCloseTo(5.05, 1);
  });
  it("is null below 20 observations", () => {
    expect(historicalVaR([0.01, -0.02], 0.95)).toBeNull();
  });
});

describe("positiveDayRatio", () => {
  it("counts strictly-positive returns", () => {
    expect(positiveDayRatio([0.1, -0.1, 0, 0.2])).toBeCloseTo(50, 10); // 2 of 4
  });
});

describe("histogram", () => {
  it("buckets values into equal-width bins summing to n", () => {
    const bins = histogram([0, 1, 2, 3, 4], 5);
    expect(bins).toHaveLength(5);
    expect(bins.reduce((s, b) => s + b.count, 0)).toBe(5);
    expect(bins[0].x0).toBe(0);
    expect(bins[4].x1).toBeCloseTo(4, 10);
  });
  it("collapses a constant sample into one bin", () => {
    expect(histogram([2, 2, 2], 10)).toEqual([{ x0: 2, x1: 2, count: 3 }]);
  });
});

describe("monthlyReturnStats", () => {
  it("averages month-over-month returns by calendar month across years", () => {
    // Two Januaries: Dec→Jan of +10% then +20% should average to +15% for month 1.
    const closes = [
      { date: "2023-12-29", close: 100 },
      { date: "2024-01-31", close: 110 }, // Jan 2024: +10%
      { date: "2024-12-31", close: 100 },
      { date: "2025-01-31", close: 120 }, // Jan 2025: +20%
    ];
    const stats = monthlyReturnStats(closes);
    const jan = stats.find((s) => s.month === 1)!;
    expect(jan.years).toBe(2);
    expect(jan.avgReturn!).toBeCloseTo(15, 6);
    // A month with no data reports null / 0 years.
    expect(stats.find((s) => s.month === 6)!.avgReturn).toBeNull();
  });
});
