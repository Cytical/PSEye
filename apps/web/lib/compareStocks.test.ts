import { describe, expect, it } from "vitest";
import { normalizeCompareSeries } from "./compareStocks";

describe("normalizeCompareSeries", () => {
  it("returns an empty array for no series", () => {
    expect(normalizeCompareSeries([])).toEqual([]);
  });

  it("returns an empty array when any series has no closes at all", () => {
    const result = normalizeCompareSeries([
      { ticker: "A", companyName: "A Corp", closes: [{ date: "2025-01-01", close: 10 }] },
      { ticker: "B", companyName: "B Corp", closes: [] },
    ]);
    expect(result).toEqual([]);
  });

  it("rebases every series to 0% at the first shared date", () => {
    const result = normalizeCompareSeries([
      {
        ticker: "A",
        companyName: "A Corp",
        closes: [
          { date: "2025-01-01", close: 10 },
          { date: "2025-01-02", close: 12 },
          { date: "2025-01-03", close: 15 },
        ],
      },
      {
        ticker: "B",
        companyName: "B Corp",
        closes: [
          { date: "2025-01-01", close: 100 },
          { date: "2025-01-02", close: 90 },
          { date: "2025-01-03", close: 110 },
        ],
      },
    ]);

    expect(result).toHaveLength(2);
    expect(result[0].points).toEqual([
      { date: "2025-01-01", pct: 0 },
      { date: "2025-01-02", pct: 20 },
      { date: "2025-01-03", pct: 50 },
    ]);
    expect(result[1].points).toEqual([
      { date: "2025-01-01", pct: 0 },
      { date: "2025-01-02", pct: -10 },
      { date: "2025-01-03", pct: 10 },
    ]);
  });

  it("only includes dates present in every series, aligned by date not array position", () => {
    const result = normalizeCompareSeries([
      {
        ticker: "A",
        companyName: "A Corp",
        // Listed a day later than B — 2025-01-01 has no A close.
        closes: [
          { date: "2025-01-02", close: 10 },
          { date: "2025-01-03", close: 11 },
        ],
      },
      {
        ticker: "B",
        companyName: "B Corp",
        closes: [
          { date: "2025-01-01", close: 100 },
          { date: "2025-01-02", close: 105 },
          { date: "2025-01-03", close: 110 },
        ],
      },
    ]);

    // The shared dates are 2025-01-02 and 2025-01-03; rebased against those, not 01-01.
    expect(result[0].points.map((p) => p.date)).toEqual(["2025-01-02", "2025-01-03"]);
    expect(result[0].points).toEqual([
      { date: "2025-01-02", pct: 0 },
      { date: "2025-01-03", pct: 10 },
    ]);
  });

  it("returns an empty array when there are no shared dates at all", () => {
    const result = normalizeCompareSeries([
      { ticker: "A", companyName: "A Corp", closes: [{ date: "2025-01-01", close: 10 }] },
      { ticker: "B", companyName: "B Corp", closes: [{ date: "2025-02-01", close: 20 }] },
    ]);
    expect(result).toEqual([]);
  });
});
