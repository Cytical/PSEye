import { describe, expect, it } from "vitest";
import { computeMoodSummary } from "./news";
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
