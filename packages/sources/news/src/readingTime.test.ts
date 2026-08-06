import { describe, expect, it } from "vitest";
import { formatReadingTime } from "./readingTime";

describe("formatReadingTime", () => {
  it("omits the estimate when the feed shipped no body to measure", () => {
    expect(formatReadingTime(null)).toBeNull();
    expect(formatReadingTime(undefined)).toBeNull();
    expect(formatReadingTime(0)).toBeNull();
  });

  it("floors at one minute rather than reporting zero", () => {
    expect(formatReadingTime(40)).toBe("1 min read");
  });

  it("scales with length", () => {
    expect(formatReadingTime(450)).toBe("2 min read");
    expect(formatReadingTime(2250)).toBe("10 min read");
  });
});
