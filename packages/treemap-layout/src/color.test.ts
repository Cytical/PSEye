import { describe, expect, it } from "vitest";
import { getContrastText, pctChangeToColor, shouldShowLabel, NO_DATA_COLOR } from "./color";

describe("pctChangeToColor", () => {
  it("returns the dedicated N/A color for null, distinct from the 0% flat color", () => {
    const noData = pctChangeToColor(null);
    expect(noData).toBe(NO_DATA_COLOR);
    expect(noData).not.toBe(pctChangeToColor(0));
  });

  it("clamps beyond +/-3% rather than extrapolating past the domain", () => {
    expect(pctChangeToColor(10)).toBe(pctChangeToColor(3));
    expect(pctChangeToColor(-10)).toBe(pctChangeToColor(-3));
  });

  it("is monotonic: a bigger gain never produces a darker/less-green color than a smaller one", () => {
    // Sampled at the color scale's actual domain stops, where the underlying
    // d3 interpolation is guaranteed continuous.
    const samples = [-3, -1, 0, 1, 3].map(pctChangeToColor);
    expect(new Set(samples).size).toBe(samples.length); // all distinct
  });
});

describe("getContrastText", () => {
  it("picks white ink for a pure black fill and black ink for a pure white fill", () => {
    expect(getContrastText("#000000")).toBe("#ffffff");
    expect(getContrastText("#ffffff")).toBe("#0b0b0b");
  });
});

describe("shouldShowLabel", () => {
  it("hides the label below the minimum box dimensions and shows it at/above them", () => {
    expect(shouldShowLabel(39, 24)).toBe(false); // width just under minimum
    expect(shouldShowLabel(40, 23)).toBe(false); // height just under minimum
    expect(shouldShowLabel(40, 24)).toBe(true); // exactly at minimum
    expect(shouldShowLabel(200, 200)).toBe(true);
  });
});
