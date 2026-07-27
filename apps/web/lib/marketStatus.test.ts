import { describe, expect, it } from "vitest";
import { getMarketStatus } from "./marketStatus";

/** Manila is UTC+8 with no DST, so PHT minus 8 gives the UTC instant to pass in. */
function manila(iso: string) {
  return new Date(`${iso}Z`);
}

describe("getMarketStatus", () => {
  it("is open during the continuous session on a weekday", () => {
    // 2026-07-28 is a Tuesday. 01:30Z = 09:30 PHT, the open.
    expect(getMarketStatus(manila("2026-07-28T01:30:00")).open).toBe(true);
    expect(getMarketStatus(manila("2026-07-28T04:00:00")).open).toBe(true); // 12:00 PHT
    expect(getMarketStatus(manila("2026-07-28T07:29:00")).open).toBe(true); // 15:29 PHT
  });

  it("is closed on the boundaries either side of the session", () => {
    expect(getMarketStatus(manila("2026-07-28T01:29:00")).open).toBe(false); // 09:29 PHT
    expect(getMarketStatus(manila("2026-07-28T07:30:00")).open).toBe(false); // 15:30 PHT, the close
  });

  it("is closed at weekends even during session hours", () => {
    // 2026-07-25 Saturday, 2026-07-26 Sunday, both at 12:00 PHT.
    expect(getMarketStatus(manila("2026-07-25T04:00:00")).open).toBe(false);
    expect(getMarketStatus(manila("2026-07-26T04:00:00")).open).toBe(false);
  });

  it("reads the clock in Manila, not UTC", () => {
    // 2026-07-28T23:00Z is 07:00 PHT on the 29th — before the open, and on a
    // different calendar day than UTC would report. A UTC-based check would
    // call this mid-evening of the 28th and could get the weekday wrong too.
    expect(getMarketStatus(manila("2026-07-28T23:00:00")).open).toBe(false);
    // Friday 2026-07-31T23:00Z is Saturday 07:00 PHT — closed for the weekend
    // even though it is still Friday in UTC.
    expect(getMarketStatus(manila("2026-07-31T23:00:00")).open).toBe(false);
  });

  it("labels match the boolean", () => {
    expect(getMarketStatus(manila("2026-07-28T04:00:00")).label).toBe("Market open");
    expect(getMarketStatus(manila("2026-07-28T09:00:00")).label).toBe("Market closed");
  });
});
