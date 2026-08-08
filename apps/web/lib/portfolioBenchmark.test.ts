import { describe, expect, it } from "vitest";
import { alignPortfolioToBenchmark } from "./portfolioBenchmark";

describe("alignPortfolioToBenchmark", () => {
  it("rebases both series to 0% at the first shared date", () => {
    const result = alignPortfolioToBenchmark(
      [
        { date: "2026-01-01", value: 1000 },
        { date: "2026-01-02", value: 1100 },
      ],
      [
        { date: "2026-01-01", close: 10000 },
        { date: "2026-01-02", close: 9500 },
      ]
    );
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ date: "2026-01-01", portfolioReturnPct: 0, benchmarkReturnPct: 0 });
    expect(result[1].date).toBe("2026-01-02");
    expect(result[1].portfolioReturnPct).toBeCloseTo(10);
    expect(result[1].benchmarkReturnPct).toBeCloseTo(-5);
  });

  it("drops dates not present in both series", () => {
    const result = alignPortfolioToBenchmark(
      [
        { date: "2026-01-01", value: 1000 },
        { date: "2026-01-02", value: 1100 }, // no benchmark data for this date
        { date: "2026-01-03", value: 1200 },
      ],
      [
        { date: "2026-01-01", close: 10000 },
        { date: "2026-01-03", close: 11000 },
      ]
    );
    expect(result.map((p) => p.date)).toEqual(["2026-01-01", "2026-01-03"]);
  });

  it("returns an empty array when there's no shared date", () => {
    expect(alignPortfolioToBenchmark([{ date: "2026-01-01", value: 1000 }], [{ date: "2026-02-01", close: 10000 }])).toEqual([]);
  });
});
