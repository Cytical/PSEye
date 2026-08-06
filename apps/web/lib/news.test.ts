import { describe, expect, it } from "vitest";
import {
  computeMoodSummary,
  computeMostMentioned,
  countDesks,
  groupIntoSections,
  pickFeatured,
  pickLatest,
  rankClusters,
  scoreImportance,
  scoreStory,
} from "./news";
import { clusterStories, type NewsItem } from "@pseye/source-news";

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
    author: null,
    topic: null,
    wordCount: null,
    ...overrides,
  };
}

/** groupIntoSections takes clusters, but every test here cares about the
 * grouping rather than the clustering, so each story is its own cluster. */
function soloClusters(items: NewsItem[]) {
  return items.map((lead) => ({ lead, alsoCoveredBy: [] }));
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

describe("computeMostMentioned", () => {
  it("ranks companies by how many stories name them", () => {
    expect(
      computeMostMentioned([
        item({ tickers: ["ICT", "BDO"] }),
        item({ tickers: ["ICT"] }),
        item({ tickers: ["ICT", "BDO"] }),
      ])
    ).toEqual([
      { ticker: "ICT", stories: 3 },
      { ticker: "BDO", stories: 2 },
    ]);
  });

  it("drops a company named in only one story", () => {
    expect(computeMostMentioned([item({ tickers: ["ICT", "MEG"] }), item({ tickers: ["ICT"] })])).toEqual([
      { ticker: "ICT", stories: 2 },
    ]);
  });

  it("counts per story, not per cluster, so heavy coverage ranks", () => {
    // Five outlets on one event is precisely the signal that this is the
    // week's story, so the rail must not see it as a single mention.
    const sameEvent = Array.from({ length: 5 }, () => item({ tickers: ["ICT"] }));
    expect(computeMostMentioned(sameEvent)).toEqual([{ ticker: "ICT", stories: 5 }]);
  });

  it("breaks ties alphabetically so the rail is stable between renders", () => {
    const result = computeMostMentioned([
      item({ tickers: ["MEG", "BDO", "ALI"] }),
      item({ tickers: ["MEG", "BDO", "ALI"] }),
    ]);
    expect(result.map((r) => r.ticker)).toEqual(["ALI", "BDO", "MEG"]);
  });

  it("caps the rail at six companies", () => {
    const many = Array.from({ length: 2 }, () =>
      item({ tickers: ["A", "B", "C", "D", "E", "F", "G", "H"] })
    );
    expect(computeMostMentioned(many)).toHaveLength(6);
  });

  it("returns nothing rather than an empty rail when no story is tagged", () => {
    expect(computeMostMentioned([item(), item()])).toEqual([]);
    expect(computeMostMentioned([])).toEqual([]);
  });
});

describe("groupIntoSections", () => {
  const three = (topic: NewsItem["topic"]) =>
    soloClusters([item({ topic }), item({ topic }), item({ topic })]);

  it("gives a desk its own section once it clears the minimum", () => {
    const sections = groupIntoSections(three("Energy & Power"));
    expect(sections).toEqual([
      { topic: "Energy & Power", stories: expect.arrayContaining([]) },
    ]);
    expect(sections[0].stories).toHaveLength(3);
  });

  it("folds a desk under the minimum into the catch-all instead of naming it", () => {
    const sections = groupIntoSections(
      soloClusters([item({ topic: "Mining" }), item({ topic: "Property" })])
    );
    expect(sections.map((s) => s.topic)).toEqual(["General Business"]);
    expect(sections[0].stories).toHaveLength(2);
  });

  it("orders desks as NEWS_TOPICS declares them, not by story count", () => {
    // Property has more stories than Markets here; Markets still leads,
    // because a section front that reshuffles hourly is unlearnable.
    const sections = groupIntoSections([
      ...three("Property"),
      ...soloClusters([item({ topic: "Property" }), item({ topic: "Property" })]),
      ...three("Markets"),
    ]);
    expect(sections.map((s) => s.topic)).toEqual(["Markets", "Property"]);
  });

  it("always puts the catch-all last", () => {
    const sections = groupIntoSections([
      ...soloClusters([item({ topic: null })]),
      ...three("Economy"),
      ...soloClusters([item({ topic: "General Business" })]),
    ]);
    expect(sections.map((s) => s.topic)).toEqual(["Economy", "General Business"]);
    expect(sections[1].stories).toHaveLength(2);
  });

  it("keeps every story: nothing is dropped by grouping", () => {
    const clusters = [
      ...three("Markets"),
      ...three("Mining"),
      ...soloClusters([item({ topic: "Consumer" }), item({ topic: null })]),
    ];
    const total = groupIntoSections(clusters).reduce((n, s) => n + s.stories.length, 0);
    expect(total).toBe(clusters.length);
  });

  it("returns nothing for an empty list rather than an empty catch-all", () => {
    expect(groupIntoSections([])).toEqual([]);
  });

  it("groups by the cluster's lead, so a merged story files under one desk", () => {
    const clusters = clusterStories([
      item({ title: "BSP keeps policy rate steady at 5.25%", topic: "Banking & Finance" }),
      item({ title: "BSP holds policy rate steady at 5.25 percent", topic: "Economy" }),
    ]);
    expect(clusters).toHaveLength(1);
    // Under the minimum, so it lands in the catch-all rather than in either
    // of the two desks its members claimed.
    expect(groupIntoSections(clusters).map((s) => s.topic)).toEqual(["General Business"]);
  });
});

describe("countDesks", () => {
  it("counts every desk and gives each a slug", () => {
    expect(
      countDesks(
        soloClusters([
          item({ topic: "Mining" }),
          item({ topic: "Mining" }),
          item({ topic: "Banking & Finance" }),
        ])
      )
    ).toEqual([
      { topic: "Banking & Finance", slug: "banking-and-finance", count: 1 },
      { topic: "Mining", slug: "mining", count: 2 },
    ]);
  });

  it("omits desks with nothing filed, so the nav never links to an empty page", () => {
    const desks = countDesks(soloClusters([item({ topic: "Property" })]));
    expect(desks.map((d) => d.topic)).toEqual(["Property"]);
  });

  it("counts unclassified stories under the catch-all rather than dropping them", () => {
    const desks = countDesks(
      // A desk name the lexicon has never produced, i.e. what a stale
      // news_items.topic row looks like after NEWS_TOPICS is edited.
      soloClusters([item({ topic: null }), item({ topic: "Nonsense Desk" as NewsItem["topic"] })])
    );
    expect(desks).toEqual([{ topic: "General Business", slug: "general-business", count: 2 }]);
  });

  it("keeps NEWS_DESKS order regardless of how many stories each desk has", () => {
    // Mining sits near the end of NEWS_TOPICS and has the most stories here;
    // it still sorts after Earnings, for the same reason groupIntoSections
    // fixes its order.
    const desks = countDesks(
      soloClusters([
        item({ topic: "Mining" }),
        item({ topic: "Mining" }),
        item({ topic: "Mining" }),
        item({ topic: "Earnings" }),
      ])
    );
    expect(desks.map((d) => d.topic)).toEqual(["Earnings", "Mining"]);
  });

  it("returns nothing for an empty corpus", () => {
    expect(countDesks([])).toEqual([]);
  });
});

const NOW = new Date("2026-08-07T12:00:00Z").getTime();

/** A cluster filed `hoursAgo` before NOW. */
function cluster(hoursAgo: number, overrides: Partial<NewsItem> = {}, alsoCoveredBy: NewsItem[] = []) {
  return {
    lead: item({ publishedAt: new Date(NOW - hoursAgo * 3_600_000), ...overrides }),
    alsoCoveredBy,
  };
}

describe("scoreImportance", () => {
  it("rates a story about a listed company above a generic one", () => {
    expect(scoreImportance(cluster(0, { tickers: ["BDO"] }))).toBeGreaterThan(
      scoreImportance(cluster(0))
    );
  });

  it("rates a story several outlets picked up above a single-outlet one", () => {
    const solo = cluster(0, { tickers: ["BDO"] });
    const wire = cluster(0, { tickers: ["BDO"] }, [item(), item(), item()]);
    expect(scoreImportance(wire)).toBeGreaterThan(scoreImportance(solo));
  });

  it("stops rewarding pickup past three other outlets", () => {
    const three = cluster(0, {}, [item(), item(), item()]);
    const eight = cluster(0, {}, Array.from({ length: 8 }, () => item()));
    // Otherwise one wire story republished by every masthead on the list
    // would outrank everything else on the page indefinitely.
    expect(scoreImportance(eight)).toBe(scoreImportance(three));
  });

  it("credits a core desk over a peripheral one", () => {
    expect(scoreImportance(cluster(0, { topic: "Markets" }))).toBeGreaterThan(
      scoreImportance(cluster(0, { topic: "Consumer" }))
    );
  });

  it("credits a real body over a two-paragraph brief", () => {
    expect(scoreImportance(cluster(0, { wordCount: 900 }))).toBeGreaterThan(
      scoreImportance(cluster(0, { wordCount: 90 }))
    );
    // A feed that ships no body at all must not be penalised into oblivion:
    // three of the eight outlets never send content:encoded.
    expect(scoreImportance(cluster(0, { wordCount: null }))).toBe(
      scoreImportance(cluster(0, { wordCount: 90 }))
    );
  });
});

describe("scoreStory", () => {
  it("halves a story's score every 48 hours", () => {
    const fresh = scoreStory(cluster(0, { tickers: ["BDO"] }), NOW);
    const twoDays = scoreStory(cluster(48, { tickers: ["BDO"] }), NOW);
    expect(twoDays).toBeCloseTo(fresh / 2, 5);
  });

  it("still ranks a week-old story above nothing, so the 7-day window is real", () => {
    expect(scoreStory(cluster(168, { tickers: ["BDO"] }), NOW)).toBeGreaterThan(0);
  });

  it("lets a big older story outrank a trivial newer one", () => {
    // The case a pure date sort cannot express, and the reason this exists:
    // Monday's story that five outlets covered vs. an untagged Wednesday brief.
    const big = cluster(48, { tickers: ["SM", "BDO"], topic: "Markets", wordCount: 800 }, [
      item(),
      item(),
      item(),
    ]);
    const trivial = cluster(6);
    expect(scoreStory(big, NOW)).toBeGreaterThan(scoreStory(trivial, NOW));
  });

  it("does not let importance beat recency without limit", () => {
    // Same maximal story, a week old, against an ordinary one-day-old one
    // about a listed company. Age has to win eventually or the front page
    // never turns over.
    const stale = cluster(168, { tickers: ["SM", "BDO"], topic: "Markets", wordCount: 800 }, [
      item(),
      item(),
      item(),
    ]);
    const yesterday = cluster(24, { tickers: ["BDO"] });
    expect(scoreStory(stale, NOW)).toBeLessThan(scoreStory(yesterday, NOW));
  });

  it("treats a future-dated story as brand new rather than scoring it up", () => {
    // Outlets do stamp items minutes into the future. Without the clamp the
    // decay term goes above 1 and a clock skew becomes a ranking boost.
    expect(scoreStory(cluster(-3, { tickers: ["BDO"] }), NOW)).toBe(
      scoreStory(cluster(0, { tickers: ["BDO"] }), NOW)
    );
  });
});

describe("rankClusters", () => {
  it("orders by score, highest first", () => {
    const ranked = rankClusters(
      [
        cluster(1, { title: "trivial" }),
        cluster(30, { title: "big", tickers: ["BDO"] }, [item(), item()]),
      ],
      NOW
    );
    expect(ranked.map((c) => c.lead.title)).toEqual(["big", "trivial"]);
  });

  it("breaks ties on the caller's order, which is newest-first", () => {
    const ranked = rankClusters([cluster(1, { title: "newer" }), cluster(1, { title: "older" })], NOW);
    expect(ranked.map((c) => c.lead.title)).toEqual(["newer", "older"]);
  });

  it("does not mutate its input", () => {
    const input = [cluster(1, { title: "a" }), cluster(30, { title: "b", tickers: ["BDO"] })];
    rankClusters(input, NOW);
    expect(input.map((c) => c.lead.title)).toEqual(["a", "b"]);
  });
});

describe("pickFeatured", () => {
  it("fills the rail with Markets stories before anything else", () => {
    const featured = pickFeatured([
      cluster(0, { title: "hero", topic: "Economy" }),
      cluster(1, { title: "macro a", topic: "Economy" }),
      cluster(2, { title: "markets a", topic: "Markets" }),
      cluster(3, { title: "macro b", topic: "Economy" }),
      cluster(4, { title: "markets b", topic: "Markets" }),
    ]);
    expect(featured.map((c) => c.lead.title)).toEqual(["hero", "markets a", "markets b", "macro a"]);
  });

  it("falls back to any PSE-tagged story before an untagged one", () => {
    const featured = pickFeatured([
      cluster(0, { title: "hero" }),
      cluster(1, { title: "untagged" }),
      cluster(2, { title: "tagged", tickers: ["JFC"] }),
      cluster(3, { title: "untagged 2" }),
    ]);
    expect(featured.map((c) => c.lead.title)).toEqual(["hero", "tagged", "untagged", "untagged 2"]);
  });

  it("leaves the hero alone whatever desk it came from", () => {
    // A major economic story must not be demoted under a minor one about a
    // listed company just because the rail prefers Markets.
    const featured = pickFeatured([
      cluster(0, { title: "BSP cuts rates", topic: "Economy" }),
      cluster(1, { title: "small cap files", topic: "Markets" }),
    ]);
    expect(featured[0].lead.title).toBe("BSP cuts rates");
  });

  it("caps the rail at three sub-headlines", () => {
    const featured = pickFeatured(
      Array.from({ length: 12 }, (_, i) => cluster(i, { title: `s${i}`, topic: "Markets" }))
    );
    expect(featured).toHaveLength(4);
  });

  it("never repeats a story across the hero and the rail", () => {
    const featured = pickFeatured([
      cluster(0, { title: "hero", topic: "Markets", tickers: ["BDO"] }),
      cluster(1, { title: "b", topic: "Markets", tickers: ["BPI"] }),
    ]);
    expect(new Set(featured.map((c) => c.lead.title)).size).toBe(featured.length);
  });

  it("returns nothing when there are no stories", () => {
    expect(pickFeatured([])).toEqual([]);
  });
});

describe("pickLatest", () => {
  it("returns the newest stories regardless of score", () => {
    const big = cluster(40, { title: "big", tickers: ["BDO"] }, [item(), item()]);
    const small = cluster(1, { title: "small" });
    expect(pickLatest([big, small], []).map((c) => c.lead.title)).toEqual(["small", "big"]);
  });

  it("skips whatever is already on the front page", () => {
    const hero = cluster(0, { title: "hero" });
    const next = cluster(5, { title: "next" });
    expect(pickLatest([hero, next], [hero]).map((c) => c.lead.title)).toEqual(["next"]);
  });

  it("caps the strip at four", () => {
    expect(
      pickLatest(
        Array.from({ length: 9 }, (_, i) => cluster(i)),
        []
      )
    ).toHaveLength(4);
  });
});
