import { describe, expect, it } from "vitest";
import { computeTreemapLayout, SECTOR_HEADER_HEIGHT, type TreemapInput } from "./computeLayout";

const WIDTH = 1000;
const HEIGHT = 600;

describe("computeTreemapLayout", () => {
  it("returns empty sectors/stocks for an empty input", () => {
    const layout = computeTreemapLayout([], WIDTH, HEIGHT);
    expect(layout.stocks).toEqual([]);
    expect(layout.sectors).toEqual([]);
  });

  it("groups stocks by sector into one rect per distinct sector", () => {
    const stocks: TreemapInput[] = [
      { ticker: "AAA", sector: "Financials", marketCap: 100, pctChange: 1 },
      { ticker: "BBB", sector: "Financials", marketCap: 200, pctChange: -1 },
      { ticker: "CCC", sector: "Industrials", marketCap: 50, pctChange: 0 },
    ];

    const layout = computeTreemapLayout(stocks, WIDTH, HEIGHT);

    expect(layout.sectors.map((s) => s.sector).sort()).toEqual(["Financials", "Industrials"]);
    expect(layout.stocks).toHaveLength(3);
    for (const box of layout.stocks) {
      const original = stocks.find((s) => s.ticker === box.ticker)!;
      expect(box.sector).toBe(original.sector);
      expect(box.pctChange).toBe(original.pctChange);
    }
  });

  it("keeps every rect within the requested canvas bounds", () => {
    const stocks: TreemapInput[] = [
      { ticker: "AAA", sector: "Financials", marketCap: 5_000_000, pctChange: 2 },
      { ticker: "BBB", sector: "Financials", marketCap: 10, pctChange: -2 },
      { ticker: "CCC", sector: "Industrials", marketCap: 300, pctChange: null },
    ];

    const layout = computeTreemapLayout(stocks, WIDTH, HEIGHT);

    for (const box of [...layout.stocks, ...layout.sectors]) {
      expect(box.x0).toBeGreaterThanOrEqual(0);
      expect(box.y0).toBeGreaterThanOrEqual(0);
      expect(box.x1).toBeLessThanOrEqual(WIDTH);
      expect(box.y1).toBeLessThanOrEqual(HEIGHT);
      expect(box.x1).toBeGreaterThanOrEqual(box.x0);
      expect(box.y1).toBeGreaterThanOrEqual(box.y0);
    }
  });

  it("still gives a zero/negative-market-cap stock a nonzero-area box (floored to 1)", () => {
    const stocks: TreemapInput[] = [
      { ticker: "AAA", sector: "Financials", marketCap: 1000, pctChange: 1 },
      { ticker: "ZERO", sector: "Financials", marketCap: 0, pctChange: null },
    ];

    const layout = computeTreemapLayout(stocks, WIDTH, HEIGHT);
    const zeroBox = layout.stocks.find((b) => b.ticker === "ZERO")!;
    expect(zeroBox.x1 - zeroBox.x0).toBeGreaterThan(0);
    expect(zeroBox.y1 - zeroBox.y0).toBeGreaterThan(0);
  });

  it("sizes a low-free-float stock by its float-adjusted market cap, not raw marketCap", () => {
    // Mirrors MFC/Manulife: a ₱4.15T raw "Market Capitalization" (global
    // shares) but only 0.20% actually free-floated on the PSE, vs. a normal
    // high-float large cap with a much smaller raw number.
    const stocks: TreemapInput[] = [
      { ticker: "MFC", sector: "Financials", marketCap: 4_151_430_334_190, pctChange: -2.88, freeFloatPct: 0.2 },
      { ticker: "SM", sector: "Holding Firms", marketCap: 714_665_748_720, pctChange: 0.5, freeFloatPct: 46.89 },
    ];

    const layout = computeTreemapLayout(stocks, WIDTH, HEIGHT);
    const mfc = layout.stocks.find((b) => b.ticker === "MFC")!;
    const sm = layout.stocks.find((b) => b.ticker === "SM")!;
    const area = (b: typeof mfc) => (b.x1 - b.x0) * (b.y1 - b.y0);

    // Float-adjusted: MFC ≈ ₱8.3B vs SM ≈ ₱335.1B — SM's box should be the
    // far larger one. Raw marketCap would have put MFC ~5.8x larger than SM.
    expect(area(sm)).toBeGreaterThan(area(mfc));
  });

  it("falls back to raw marketCap when freeFloatPct is unknown", () => {
    const stocks: TreemapInput[] = [
      { ticker: "AAA", sector: "Financials", marketCap: 1000, pctChange: 1 },
      { ticker: "BBB", sector: "Financials", marketCap: 100, pctChange: -1 },
    ];

    const layout = computeTreemapLayout(stocks, WIDTH, HEIGHT);
    const aaa = layout.stocks.find((b) => b.ticker === "AAA")!;
    const bbb = layout.stocks.find((b) => b.ticker === "BBB")!;
    const area = (b: typeof aaa) => (b.x1 - b.x0) * (b.y1 - b.y0);
    expect(area(aaa)).toBeGreaterThan(area(bbb));
  });

  it("reserves SECTOR_HEADER_HEIGHT at the top of each sector for its header bar", () => {
    const stocks: TreemapInput[] = [
      { ticker: "AAA", sector: "Financials", marketCap: 1000, pctChange: 1 },
      { ticker: "BBB", sector: "Financials", marketCap: 500, pctChange: 1 },
    ];

    const layout = computeTreemapLayout(stocks, WIDTH, HEIGHT);
    const sector = layout.sectors[0];
    for (const box of layout.stocks) {
      expect(box.y0).toBeGreaterThanOrEqual(sector.y0 + SECTOR_HEADER_HEIGHT);
    }
  });
});
