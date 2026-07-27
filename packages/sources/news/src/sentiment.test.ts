import { describe, expect, it } from "vitest";
import { scoreSentiment } from "./sentiment";

describe("scoreSentiment", () => {
  it("buckets a clearly positive headline as positive", () => {
    const result = scoreSentiment("BDO profit surges as loan growth beats expectations");
    expect(result.sentiment).toBe("positive");
    expect(result.score).toBeGreaterThan(0);
  });

  it("buckets a clearly negative headline as negative", () => {
    const result = scoreSentiment("Shares plunge after fraud probe and downgrade");
    expect(result.sentiment).toBe("negative");
    expect(result.score).toBeLessThan(0);
  });

  it("buckets a headline with no sentiment words as neutral", () => {
    const result = scoreSentiment("BSP holds policy meeting on Thursday");
    expect(result.sentiment).toBe("neutral");
    expect(result.score).toBe(0);
  });

  it("buckets a mixed headline by net score, not by which word list matched first", () => {
    // one negative ("cut"), two positive ("growth", "beat") -> net positive
    const result = scoreSentiment("Rate cut expected to support growth as bank beats forecasts");
    expect(result.sentiment).toBe("positive");
    expect(result.score).toBe(1);
  });

  it("is case-insensitive", () => {
    expect(scoreSentiment("SURGE IN PROFIT").sentiment).toBe("positive");
    expect(scoreSentiment("Surge In Profit").sentiment).toBe("positive");
  });

  it("only matches whole words, not substrings", () => {
    // "shortfall" is itself a listed negative word, but this also confirms
    // the standalone "fall" entry doesn't double-count by matching inside
    // it (word-boundary matching, not substring matching).
    expect(scoreSentiment("Firm reports a small shortfall").score).toBe(-1);
    // "cutting-edge" must not match the standalone "cut" entry.
    expect(scoreSentiment("Cutting-edge technology unveiled").score).toBe(0);
  });

  it("scores title + snippet together when concatenated by the caller", () => {
    const title = "Company reports quarterly results";
    const snippet = "Net income declined amid weak demand";
    expect(scoreSentiment(`${title} ${snippet}`).sentiment).toBe("negative");
  });

  it("matches multi-word phrases like 'record high'", () => {
    expect(scoreSentiment("Index closes at a record high").sentiment).toBe("positive");
  });
});
