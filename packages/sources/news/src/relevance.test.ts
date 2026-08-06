import { describe, expect, it } from "vitest";
import { isBusinessRelevant } from "./relevance";

describe("isBusinessRelevant", () => {
  it("drops the non-business sections the site-wide feeds carry", () => {
    // Every one of these is a live URL from Malaya's feed, which is the whole
    // paper despite being configured as "Malaya Business Insight".
    for (const url of [
      "https://malaya.com.ph/opinion/editorial-cartoon/editorial-cartoon-467/",
      "https://malaya.com.ph/opinion/column-of-the-day/value-of-naps/",
      "https://malaya.com.ph/entertainment/us-box-office-thrives-despite-attendance-dip/",
      "https://malaya.com.ph/special-features/landbank-gawad-tanyag-celebrating-excellence/",
    ]) {
      expect(isBusinessRelevant(url)).toBe(false);
    }
  });

  it("keeps real business stories", () => {
    for (const url of [
      "https://www.manilatimes.net/2026/08/07/business/top-business/farm-output-recovers/2400374",
      "https://www.bworldonline.com/economy/2026/08/07/inflation-slows/",
      "https://business.inquirer.net/123456/spot-power-prices-fall",
      "https://malaya.com.ph/business/psei-slips-on-profit-taking/",
    ]) {
      expect(isBusinessRelevant(url)).toBe(true);
    }
  });

  it("keeps business opinion, dropping only the clearly non-business columns", () => {
    // /opinion/ as a whole is deliberately allowed: BusinessWorld and Manila
    // Times both file real market analysis there.
    expect(isBusinessRelevant("https://www.bworldonline.com/opinion/2026/08/07/peso-outlook/")).toBe(true);
    expect(isBusinessRelevant("https://malaya.com.ph/opinion/column-of-the-day/a-sacred-obligation/")).toBe(false);
  });

  it("matches whole path segments, never substrings", () => {
    // "food" as a substring would kill a food-and-beverage earnings story,
    // which is exactly what this page is for.
    expect(
      isBusinessRelevant("https://example.com/business/food-and-beverage-giant-posts-record-profit")
    ).toBe(true);
    expect(isBusinessRelevant("https://example.com/business/healthcare-reit-expands")).toBe(true);
    expect(isBusinessRelevant("https://example.com/food/best-lechon-in-cebu")).toBe(false);
  });

  it("fails open on a URL it cannot parse", () => {
    // Dropping a real story over a malformed link is the worse error.
    expect(isBusinessRelevant("not a url")).toBe(true);
    expect(isBusinessRelevant("")).toBe(true);
  });
});
