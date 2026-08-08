import { describe, expect, it } from "vitest";
import {
  isGoogleNewsRedirectUrl,
  isLikelyReferencePage,
  isOffTopicForPhilippines,
  stripGoogleNewsTitleSuffix,
} from "./googleNewsSource";

describe("stripGoogleNewsTitleSuffix", () => {
  it("strips the exact trailing outlet suffix Google News appends", () => {
    // A real live title, 2026-08-07.
    expect(
      stripGoogleNewsTitleSuffix(
        "Philippine stock exchange suspends Monday trading as typhoon hits capital - Reuters",
        "Reuters"
      )
    ).toBe("Philippine stock exchange suspends Monday trading as typhoon hits capital");
  });

  it("matches against Google's own <source> text, not a display name", () => {
    // Google's <source> for Bloomberg items is literally "Bloomberg.com",
    // not "Bloomberg" — the suffix in the title matches that raw value.
    expect(
      stripGoogleNewsTitleSuffix("Philippine Inflation Slows for Third Month - Bloomberg.com", "Bloomberg.com")
    ).toBe("Philippine Inflation Slows for Third Month");
  });

  it("leaves a title alone when it doesn't end in that exact suffix", () => {
    // Guards against eating part of a real headline that happens to end in
    // something else, e.g. a live-updates tag.
    const title = "Markets close mixed after volatile session - Live Updates";
    expect(stripGoogleNewsTitleSuffix(title, "Reuters")).toBe(title);
  });

  it("only strips a suffix that matches whole, not a substring collision", () => {
    // "- Reuters" should not be stripped from a title crediting a different
    // outlet than the one passed in.
    const title = "Some story - Reuters Institute";
    expect(stripGoogleNewsTitleSuffix(title, "Reuters")).toBe(title);
  });

  it("handles a title with no suffix at all", () => {
    expect(stripGoogleNewsTitleSuffix("A headline with no dash", "Reuters")).toBe(
      "A headline with no dash"
    );
  });
});

describe("isGoogleNewsRedirectUrl", () => {
  it("is true for Google News' own /rss/articles/ redirect link", () => {
    expect(
      isGoogleNewsRedirectUrl(
        "https://news.google.com/rss/articles/CBMisgFBVV95cUxPa05hV0x2ekJtU1lRMFZH?oc=5"
      )
    ).toBe(true);
  });

  it("is false for a real publisher URL", () => {
    expect(
      isGoogleNewsRedirectUrl(
        "https://www.reuters.com/world/asia-pacific/philippines-us-build-industrial-hub-supply-chain-security-2026-04-17/"
      )
    ).toBe(false);
  });

  it("is false for a malformed URL rather than throwing", () => {
    expect(isGoogleNewsRedirectUrl("not a url")).toBe(false);
  });
});

describe("isLikelyReferencePage", () => {
  it("rejects a bare ticker, with or without a leading exchange dot", () => {
    // All three are live titles (after suffix-stripping) seen ranking for
    // "site:reuters.com \"Philippine Stock Exchange\"" on 2026-08-07.
    expect(isLikelyReferencePage("PSE.PS")).toBe(true);
    expect(isLikelyReferencePage("(.PSI)")).toBe(true);
    expect(isLikelyReferencePage("BLOOM.PS")).toBe(true);
  });

  it("rejects Reuters' 'About <Company> (<TICKER>)' company page", () => {
    expect(isLikelyReferencePage("About Oriental Petroleum and Minerals Corp (OPMB.PS)")).toBe(true);
  });

  it("rejects any title carrying the 'Stock Price' boilerplate", () => {
    expect(isLikelyReferencePage("(ALI.PS) | Stock Price & Latest News")).toBe(true);
    expect(isLikelyReferencePage("ROCK: Rockwell Land Corp Stock Price Quote - Philippines")).toBe(true);
  });

  it("rejects a Bloomberg executive bio page", () => {
    expect(
      isLikelyReferencePage("Ramon S Monzon, Philippine Stock Exchange Inc: Profile and Biography")
    ).toBe(true);
  });

  it("keeps a real headline untouched", () => {
    expect(
      isLikelyReferencePage("Philippine stock exchange suspends Monday trading as typhoon hits capital")
    ).toBe(false);
    expect(isLikelyReferencePage("Philippine Bourse Seeks to Boost Retail Trading With New Reforms")).toBe(
      false
    );
  });
});

describe("isOffTopicForPhilippines", () => {
  it("keeps a title that names the Philippines directly", () => {
    // Live titles, 2026-08-08, from the broadened "Philippine economy"/
    // "Philippine peso"/"Philippine central bank" queries.
    expect(isOffTopicForPhilippines("Philippine economy posts slowest growth in five years")).toBe(false);
    expect(isOffTopicForPhilippines("Philippines Q2 GDP grows 2.3% yr/yr, slower than expected")).toBe(
      false
    );
  });

  it("keeps a title that only names Marcos or Manila by name", () => {
    // Live Bloomberg/Business Times Singapore titles with no
    // "Philippine"/"Philippines" token at all.
    expect(
      isOffTopicForPhilippines("Marcos Fights to Revive Economy, Presidency After Graft Debacle")
    ).toBe(false);
    expect(
      isOffTopicForPhilippines("Can softer delisting rules save Manila's bourse from hollowing out?")
    ).toBe(false);
  });

  it("drops a same-topic story about a different country", () => {
    // All four are live examples that ranked for a quoted, exact-phrase PH
    // query anyway (site:reuters.com "Philippine economy",
    // site:bloomberg.com "Philippine inflation") — proof that quoting a
    // common macro phrase doesn't reliably AND it against the site, the way
    // it does for a rare phrase like "Philippine Stock Exchange".
    expect(
      isOffTopicForPhilippines("IMF says oil prices, weak monsoon pose biggest risks to India's FY27 GDP growth")
    ).toBe(true);
    expect(
      isOffTopicForPhilippines("Shared beds, shrinking budgets: China's young workers feel economic squeeze")
    ).toBe(true);
    expect(isOffTopicForPhilippines("Peru's Inflation Tops Forecasts as Food, Transport Prices Climb")).toBe(
      true
    );
    expect(isOffTopicForPhilippines("Thai Inflation Eases to 1.95% in July, Slowing for Third Month")).toBe(
      true
    );
  });
});
