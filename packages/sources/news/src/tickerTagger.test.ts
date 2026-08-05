import { describe, expect, it } from "vitest";
import { tagTickers } from "./tickerTagger";

describe("tagTickers", () => {
  it("tags a hand-picked short/common name", () => {
    expect(tagTickers("Jollibee opens 50 new stores this year")).toContain("JFC");
  });

  it("tags a formal PSE Edge company name for a ticker outside the hand-picked list", () => {
    // Nickel Asia Corporation (NIKL) has no manual alias — this only works
    // via the auto-derived full-name alias.
    expect(tagTickers("Nickel Asia Corporation posts higher export volumes")).toContain("NIKL");
  });

  it("tags a suffix-stripped short form of a formal company name", () => {
    // "Ayala Land, Inc." stripped to "Ayala Land" is how it's actually
    // written in casual prose most of the time.
    expect(tagTickers("Ayala Land breaks ground on new residential project")).toContain("ALI");
  });

  it("does not tag unrelated text", () => {
    expect(tagTickers("Heavy rain expected in Baguio this weekend")).toEqual([]);
  });

  it("is case-insensitive", () => {
    expect(tagTickers("bdo unibank posts record earnings")).toContain("BDO");
  });

  it("tags every mentioned company, not just the first match", () => {
    const tags = tagTickers("BDO and BPI both reported strong loan growth this quarter");
    expect(tags).toEqual(expect.arrayContaining(["BDO", "BPI"]));
  });

  it("returns each ticker at most once even if matched by multiple aliases", () => {
    // "SM Investments" (hand-picked) and "SM Investments Corporation"
    // (formal name) would both match — should still only tag SM once.
    const tags = tagTickers("SM Investments Corporation announces new mall opening");
    expect(tags.filter((t) => t === "SM")).toHaveLength(1);
  });
});
