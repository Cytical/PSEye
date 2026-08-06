import { describe, expect, it } from "vitest";
import { clusterStories } from "./cluster";
import type { NewsItem } from "./types";

const BASE = new Date("2026-08-06T04:00:00Z");

function item(title: string, source: string, minutesAfterBase = 0): NewsItem {
  return {
    source,
    title,
    snippet: null,
    imageUrl: null,
    url: `https://example.com/${source}/${encodeURIComponent(title)}`,
    publishedAt: new Date(BASE.getTime() + minutesAfterBase * 60_000),
    tickers: [],
    sentiment: null,
    author: null,
    topic: null,
    wordCount: null,
  };
}

describe("clusterStories", () => {
  it("collapses the same event filed by several outlets into one cluster", () => {
    const clusters = clusterStories([
      item("BSP keeps policy rate steady at 5.25%", "BusinessWorld", 0),
      item("BSP holds policy rate steady at 5.25 percent", "Philstar Business", 20),
      item("Ayala Land opens new township in Laguna", "Manila Bulletin Business", 40),
    ]);

    expect(clusters).toHaveLength(2);
    expect(clusters[0].alsoCoveredBy.map((i) => i.source)).toEqual(["Philstar Business"]);
    expect(clusters[1].alsoCoveredBy).toEqual([]);
  });

  it("leaves a full paraphrase of the same event uncollapsed", () => {
    // Documents a real limit rather than a bug. "BSP keeps policy rate
    // steady at 5.25%" and "Central bank keeps benchmark rate unchanged"
    // are the same story but share only two content words, so overlap
    // scores them at 0.22. Catching this would need semantics, not set
    // math, and the threshold that would merge these also merges two
    // genuinely different quarters of one company's results — which is the
    // worse error, because it hides a story instead of showing one twice.
    const clusters = clusterStories([
      item("BSP keeps policy rate steady at 5.25%", "BusinessWorld", 0),
      item("Central bank keeps benchmark rate unchanged", "GMA News Money", 35),
    ]);
    expect(clusters).toHaveLength(2);
  });

  it("credits whoever filed first as the lead, not whoever filed last", () => {
    const [cluster] = clusterStories([
      item("BSP holds policy rate steady at 5.25 percent", "Philstar Business", 90),
      item("BSP keeps policy rate steady at 5.25%", "BusinessWorld", 5),
    ]);
    expect(cluster.lead.source).toBe("BusinessWorld");
  });

  it("keeps genuinely different stories about one company apart", () => {
    const tagged = (title: string, source: string, min: number) => ({
      ...item(title, source, min),
      tickers: ["URC"],
    });
    // Same ticker, so the looser ticker-assisted threshold applies. These
    // still have to stay apart: sharing a company is not sharing a story.
    const clusters = clusterStories([
      tagged("URC first-half net income rises 10% to P6.91 billion", "Manila Bulletin Business", 0),
      tagged("URC to build new snack plant in Batangas", "BusinessWorld", 10),
    ]);
    expect(clusters).toHaveLength(2);
  });

  it("merges one company's results report across outlets that worded it differently", () => {
    // Both live headlines, filed 27 minutes apart, and previously rendered as
    // two adjacent near-identical cards. Overlap alone scores them at 0.25:
    // the shared meaning sits in synonyms (profit/income) and in tokens too
    // short to survive tokenising ("11", "H1"). The shared ticker is what
    // makes them resolvable.
    const clusters = clusterStories([
      { ...item("Chinabank net profit up 11% to P14.5B in H1", "Manila Times Business", 0), tickers: ["CBC"] },
      {
        ...item("Chinabank's net income climbs 11% to P14.5 billion in first half", "BusinessWorld", 27),
        tickers: ["CBC"],
      },
    ]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].alsoCoveredBy.map((i) => i.source)).toEqual(["BusinessWorld"]);
  });

  it("does not merge two companies' results just because both are results", () => {
    const clusters = clusterStories([
      { ...item("Chinabank net profit up 11% to P14.5B in H1", "Manila Times Business", 0), tickers: ["CBC"] },
      { ...item("Metrobank net profit up 9% to P24.5B in H1", "Manila Times Business", 5), tickers: ["MBT"] },
    ]);
    expect(clusters).toHaveLength(2);
  });

  it("does not merge a recurring daily headline across days", () => {
    // "Peso closes lower against dollar" runs essentially every trading day.
    // Without the time window these would read as one story.
    const clusters = clusterStories([
      item("Peso closes lower against the dollar", "BusinessWorld", 0),
      item("Peso closes lower against the dollar", "BusinessWorld", 60 * 48),
    ]);
    expect(clusters).toHaveLength(2);
  });

  it("preserves the caller's ranking over the collapsed list", () => {
    const clusters = clusterStories([
      item("Ayala Land opens new township in Laguna", "BusinessWorld", 0),
      item("BSP keeps policy rate steady at 5.25%", "Philstar Business", 5),
      item("BSP holds policy rate steady at 5.25 percent", "GMA News Money", 6),
    ]);
    expect(clusters.map((c) => c.lead.title)).toEqual([
      "Ayala Land opens new township in Laguna",
      "BSP keeps policy rate steady at 5.25%",
    ]);
  });

  it("returns one single-member cluster per item when nothing is similar", () => {
    const input = [
      item("Gold hits seven-week peak", "Manila Times Business"),
      item("Farm output recovers in Q2", "Inquirer Business"),
      item("DOE scraps permits for home solar panels", "Manila Bulletin Business"),
    ];
    const clusters = clusterStories(input);
    expect(clusters).toHaveLength(3);
    expect(clusters.every((c) => c.alsoCoveredBy.length === 0)).toBe(true);
  });

  it("handles an empty list", () => {
    expect(clusterStories([])).toEqual([]);
  });
});
