import { describe, expect, it } from "vitest";
import { manilaToday } from "./manilaDate";

describe("manilaToday", () => {
  // Manila is UTC+8 year-round (no DST), so any UTC instant from 16:00 onward
  // is already the next calendar day there. This is exactly the window where
  // the old toISOString().slice(0, 10) answered with yesterday.
  it("rolls over at 16:00 UTC, not at 00:00 UTC", () => {
    expect(manilaToday(new Date("2026-07-27T15:59:59Z"))).toBe("2026-07-27");
    expect(manilaToday(new Date("2026-07-27T16:00:00Z"))).toBe("2026-07-28");
  });

  it("returns the Manila date for the instant that exposed the bug", () => {
    // 2026-07-27T16:48Z was 2026-07-28 00:48 in Manila; UTC-derived code called
    // it the 27th and kept a ticker whose ex-date had passed in the upcoming list.
    expect(manilaToday(new Date("2026-07-27T16:48:00Z"))).toBe("2026-07-28");
  });

  it("agrees with UTC during the other sixteen hours", () => {
    expect(manilaToday(new Date("2026-07-28T00:00:00Z"))).toBe("2026-07-28");
    expect(manilaToday(new Date("2026-07-28T15:00:00Z"))).toBe("2026-07-28");
  });

  it("carries month and year boundaries", () => {
    expect(manilaToday(new Date("2026-07-31T16:30:00Z"))).toBe("2026-08-01");
    expect(manilaToday(new Date("2026-12-31T16:00:00Z"))).toBe("2027-01-01");
  });

  it("zero-pads to a sortable YYYY-MM-DD, matching the DB's date columns", () => {
    // String comparison is how every caller decides past vs. upcoming, so the
    // padding is load-bearing, not cosmetic.
    expect(manilaToday(new Date("2026-01-05T02:00:00Z"))).toBe("2026-01-05");
    expect(manilaToday(new Date("2026-01-05T02:00:00Z"))).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
