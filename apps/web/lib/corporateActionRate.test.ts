import { describe, expect, it } from "vitest";
import { formatCorporateActionRate } from "./corporateActionRate";

describe("formatCorporateActionRate", () => {
  // Every spelling observed live in the backfilled corporate_actions table —
  // the same list dividends.test.ts asserts against, since both read the exact
  // same PSE Edge "Rate" cell.
  it.each([
    ["P0.35/share", "₱0.35/share"],
    ["Php1.00", "₱1.00"],
    ["Php 0.042114 per share", "₱0.042114/share"],
    ["Php0.01092299", "₱0.01092299"],
    ["1.40", "₱1.40"],
    [".45", "₱0.45"],
    ["P0.50", "₱0.50"],
    ["PhP2.42125", "₱2.42125"],
    ["Php 20.625", "₱20.625"],
    ["₱9.5", "₱9.50"],
  ])("normalizes %j to %j", (input, expected) => {
    expect(formatCorporateActionRate(input)).toBe(expected);
  });

  it("keeps the preferred-series suffix, which identifies which share class pays", () => {
    expect(formatCorporateActionRate("PhP2.42125 (DDPR)")).toBe("₱2.42125 (DDPR)");
    expect(formatCorporateActionRate("Php 20.625 (CLIA2)")).toBe("₱20.625 (CLIA2)");
  });

  it("pads to 2 decimals but never rounds away declared precision", () => {
    expect(formatCorporateActionRate("1")).toBe("₱1.00");
    expect(formatCorporateActionRate("1.2")).toBe("₱1.20");
    expect(formatCorporateActionRate("0.042114")).toBe("₱0.042114");
  });

  it("groups thousands so a large special dividend stays readable", () => {
    expect(formatCorporateActionRate("P1234.5")).toBe("₱1,234.50");
    expect(formatCorporateActionRate("1,234.50")).toBe("₱1,234.50");
  });

  // The whole point of anchoring the regex: anything that isn't purely a rate
  // has to survive untouched rather than be partially rewritten.
  it.each([
    ["5% stock dividend"],
    ["TBA"],
    ["1-for-8 rights offer at P38.00/share, to fund debt refinancing"],
    ["USD0.05"],
    ["$0.05"],
    ["P1.20/share special cash dividend"],
    [""],
  ])("leaves %j untouched", (input) => {
    expect(formatCorporateActionRate(input)).toBe(input.trim());
  });
});
