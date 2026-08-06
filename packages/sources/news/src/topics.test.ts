import { describe, expect, it } from "vitest";
import {
  classifyTopic,
  isNewsTopic,
  slugToTopic,
  topicToSlug,
  FALLBACK_TOPIC,
  NEWS_DESKS,
  NEWS_TOPICS,
} from "./topics";

describe("classifyTopic", () => {
  it("files a real headline from each desk under that desk", () => {
    // All taken verbatim from live feed rows, so these double as a guard
    // against a lexicon edit that reads fine but stops matching real copy.
    expect(classifyTopic("Spot power prices fall to P8.31/kWh in July")).toBe("Energy & Power");
    expect(classifyTopic("URC earnings rise on stronger branded, feed sales")).toBe("Earnings");
    expect(classifyTopic("PSEi slips on profit-taking despite inflation boost")).toBe("Earnings");
    expect(classifyTopic("SSS raises Century Properties stake to 10%")).toBe("Markets");
    expect(classifyTopic("PDIC moves to reclaim P107 billion from treasury")).toBe("Banking & Finance");
    expect(classifyTopic("Unemployed Filipinos rise slightly to 2.59M in June")).toBe("Economy");
    expect(classifyTopic("AI expansion threatens to overload the power grid")).toBe("Energy & Power");
  });

  it("returns the fallback rather than guessing when nothing matches", () => {
    expect(classifyTopic("Company holds annual meeting in Cebu")).toBe(FALLBACK_TOPIC);
    expect(classifyTopic("")).toBe(FALLBACK_TOPIC);
  });

  it("only ever returns a known desk", () => {
    const allowed = new Set<string>([...NEWS_TOPICS, FALLBACK_TOPIC]);
    for (const headline of [
      "Peso closes lower against the dollar",
      "Nickel Asia reports higher ore shipments",
      "Ayala Land opens new township in Laguna",
      "Converge expands fiber rollout",
      "DPWH bids out expressway extension",
      "Jollibee opens 100th store in Vietnam",
      "",
    ]) {
      expect(allowed.has(classifyTopic(headline))).toBe(true);
    }
  });

  it("respects the documented priority order", () => {
    // A bank's results are an Earnings story, not a Banking one: "Earnings"
    // is listed first precisely so results reporting stays together
    // regardless of which industry filed it, the same way FT separates
    // Companies from the sector desks.
    expect(classifyTopic("BDO Unibank net income climbs on higher lending")).toBe("Earnings");
    // With no results language it falls through to the bank's own desk.
    expect(classifyTopic("BDO Unibank opens 20 new branches")).toBe("Banking & Finance");
  });

  it("does not fire a space-padded keyword inside a longer word", () => {
    // " ipo" must not match "Iponan", " ai " must not match "said",
    // "tax " must not match "taxi" — the padding is the whole guard.
    expect(classifyTopic("Iponan river dredging resumes")).toBe(FALLBACK_TOPIC);
    expect(classifyTopic("Taxi operators seek fare adjustment")).toBe(FALLBACK_TOPIC);
  });

  it("is case and whitespace insensitive", () => {
    expect(classifyTopic("INFLATION   EASES\n\nIN JULY")).toBe("Economy");
  });
});

describe("isNewsTopic", () => {
  it("accepts every desk and the fallback, rejects anything else", () => {
    for (const topic of NEWS_TOPICS) expect(isNewsTopic(topic)).toBe(true);
    expect(isNewsTopic(FALLBACK_TOPIC)).toBe(true);
    expect(isNewsTopic(null)).toBe(false);
    expect(isNewsTopic("Sports")).toBe(false);
    expect(isNewsTopic("")).toBe(false);
  });
});

describe("topic slugs", () => {
  it("makes an ampersanded desk name URL-safe", () => {
    expect(topicToSlug("Banking & Finance")).toBe("banking-and-finance");
    expect(topicToSlug("Telecom & Tech")).toBe("telecom-and-tech");
    expect(topicToSlug("Mining")).toBe("mining");
  });

  it("round-trips every desk, including the catch-all", () => {
    for (const desk of NEWS_DESKS) {
      expect(slugToTopic(topicToSlug(desk))).toBe(desk);
    }
    // The catch-all being reachable is the point: without it, every story
    // classifyTopic could not place would be unreachable once the front page
    // stopped printing them all.
    expect(slugToTopic("general-business")).toBe(FALLBACK_TOPIC);
  });

  it("produces slugs that need no URL encoding", () => {
    for (const desk of NEWS_DESKS) {
      const slug = topicToSlug(desk);
      expect(slug).toMatch(/^[a-z0-9-]+$/);
      expect(encodeURIComponent(slug)).toBe(slug);
    }
  });

  it("is case-insensitive on the way back, so a hand-typed URL still resolves", () => {
    expect(slugToTopic("Energy-And-Power")).toBe("Energy & Power");
  });

  it("returns null for a slug that names no desk", () => {
    expect(slugToTopic("sports")).toBeNull();
    expect(slugToTopic("")).toBeNull();
  });

  it("gives every desk a distinct slug", () => {
    const slugs = NEWS_DESKS.map(topicToSlug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
