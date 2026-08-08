import { describe, expect, it } from "vitest";
import { computeHoldingsCorrelation, computePortfolioBeta } from "./portfolioRisk";
import type { HistoricalClose } from "@pseye/source-quotes";

function closes(...vals: number[]): HistoricalClose[] {
  return vals.map((close, i) => ({ date: `2026-01-${String(i + 1).padStart(2, "0")}`, close }));
}

describe("computePortfolioBeta", () => {
  it("weights each holding's beta by market value", () => {
    const benchmark = closes(100, 101, 99, 103, 98, 105, 100, 108, 95, 110);
    // Moves exactly with the benchmark (beta ~1) and twice as much (beta ~2).
    const matchingCloses = closes(100, 101, 99, 103, 98, 105, 100, 108, 95, 110);
    const doubleCloses = closes(100, 102, 98, 106, 96, 110, 100, 116, 90, 120);

    const beta = computePortfolioBeta(
      [
        { ticker: "A", marketValue: 100, closes: matchingCloses },
        { ticker: "B", marketValue: 100, closes: doubleCloses },
      ],
      benchmark
    );
    expect(beta).not.toBeNull();
    expect(beta!).toBeCloseTo(1.5, 1); // equal-weighted average of ~1 and ~2
  });

  it("excludes a holding with no overlapping history from the weighted average", () => {
    const benchmark = closes(100, 101, 99, 103, 98, 105, 100, 108, 95, 110);
    const beta = computePortfolioBeta(
      [
        { ticker: "A", marketValue: 100, closes: benchmark },
        { ticker: "NO_HISTORY", marketValue: 900, closes: [] },
      ],
      benchmark
    );
    // If NO_HISTORY dragged the average toward 0 this would be far from 1.
    expect(beta!).toBeCloseTo(1, 1);
  });

  it("returns null when no holding has enough data", () => {
    expect(computePortfolioBeta([{ ticker: "A", marketValue: 100, closes: [] }], closes(100, 101))).toBeNull();
  });
});

describe("computeHoldingsCorrelation", () => {
  it("puts 1 on the diagonal without computing it", () => {
    const { tickers, matrix } = computeHoldingsCorrelation([
      { ticker: "A", closes: closes(10, 11, 12) },
      { ticker: "B", closes: closes(20, 19, 21) },
    ]);
    expect(tickers).toEqual(["A", "B"]);
    expect(matrix[0][0]).toBe(1);
    expect(matrix[1][1]).toBe(1);
  });

  it("finds a perfect positive correlation between two identically-moving series", () => {
    const { matrix } = computeHoldingsCorrelation([
      { ticker: "A", closes: closes(10, 11, 12, 11, 13) },
      { ticker: "B", closes: closes(100, 110, 120, 110, 130) },
    ]);
    expect(matrix[0][1]).toBeCloseTo(1, 5);
    expect(matrix[1][0]).toBeCloseTo(1, 5);
  });

  it("returns null for a pair with no shared dates", () => {
    const { matrix } = computeHoldingsCorrelation([
      { ticker: "A", closes: [{ date: "2026-01-01", close: 10 }] },
      { ticker: "B", closes: [{ date: "2026-02-01", close: 20 }] },
    ]);
    expect(matrix[0][1]).toBeNull();
  });
});
