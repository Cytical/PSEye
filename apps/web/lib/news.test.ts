import { describe, expect, it } from "vitest";
import { computeMoodSummary, computeTrendingTickers } from "./news";
import type { NewsItem } from "@pseye/source-news";

function item(overrides: Partial<NewsItem> = {}): NewsItem {
  return {
    source: "Test Outlet",
    title: "Headline",
    snippet: null,
    imageUrl: null,
    url: `https://example.com/${Math.random()}`,
    publishedAt: new Date("2026-07-27T00:00:00Z"),
    tickers: [],
    sentiment: "neutral",
    ...overrides,
  };
}

describe("computeMoodSummary", () => {
  it("buckets each item by its sentiment", () => {
    const summary = computeMoodSummary([
      item({ sentiment: "positive" }),
      item({ sentiment: "positive" }),
      item({ sentiment: "negative" }),
      item({ sentiment: "neutral" }),
    ]);
    expect(summary).toEqual({ positive: 2, negative: 1, neutral: 1, total: 4 });
  });

  it("counts null sentiment (unscored/legacy rows) as neutral", () => {
    const summary = computeMoodSummary([item({ sentiment: null }), item({ sentiment: "positive" })]);
    expect(summary).toEqual({ positive: 1, negative: 0, neutral: 1, total: 2 });
  });

  it("returns all-zero on an empty list rather than dividing by zero", () => {
    expect(computeMoodSummary([])).toEqual({ positive: 0, negative: 0, neutral: 0, total: 0 });
  });

  it("positive + negative + neutral always equals total", () => {
    const items = [
      item({ sentiment: "positive" }),
      item({ sentiment: "negative" }),
      item({ sentiment: null }),
      item({ sentiment: "neutral" }),
      item({ sentiment: "positive" }),
    ];
    const summary = computeMoodSummary(items);
    expect(summary.positive + summary.negative + summary.neutral).toBe(summary.total);
  });
});

describe("computeTrendingTickers", () => {
  it("counts ticker mentions across items and sorts descending", () => {
    const trending = computeTrendingTickers([
      item({ tickers: ["BDO", "BPI"] }),
      item({ tickers: ["BDO"] }),
      item({ tickers: ["SM"] }),
    ]);
    expect(trending[0]).toEqual({ ticker: "BDO", count: 2 });
    expect(trending.map((t) => t.ticker)).toContain("BPI");
    expect(trending.map((t) => t.ticker)).toContain("SM");
  });

  it("breaks ties alphabetically for a stable order", () => {
    const trending = computeTrendingTickers([item({ tickers: ["SM"] }), item({ tickers: ["BDO"] })]);
    expect(trending.map((t) => t.ticker)).toEqual(["BDO", "SM"]);
  });

  it("caps the result at 8 tickers", () => {
    const items = Array.from({ length: 12 }, (_, i) => item({ tickers: [`T${i}`] }));
    expect(computeTrendingTickers(items)).toHaveLength(8);
  });

  it("returns [] when no article has a tagged ticker", () => {
    expect(computeTrendingTickers([item({ tickers: [] }), item({ tickers: [] })])).toEqual([]);
  });
});
