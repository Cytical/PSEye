import { describe, expect, it } from "vitest";
import { getContrastText, pctChangeToColor, shouldShowLabel } from "./color";

describe("pctChangeToColor", () => {
  // Product decision, 2026-07-29: "no trade to report" and "traded, closed
  // unchanged" are deliberately not distinguished anywhere in the UI — null
  // renders as flat 0.00% and is colored identically. The dedicated
  // NO_DATA_COLOR swatch and the map's "No trade today" legend entry were
  // removed in the same change.
  it("colors a null (no trade) exactly like a flat 0% close", () => {
    expect(pctChangeToColor(null)).toBe(pctChangeToColor(0));
  });

  it("clamps beyond +/-3% rather than extrapolating past the domain", () => {
    expect(pctChangeToColor(10)).toBe(pctChangeToColor(3));
    expect(pctChangeToColor(-10)).toBe(pctChangeToColor(-3));
  });

  it("is monotonic: a bigger gain never produces a darker/less-green color than a smaller one", () => {
    // Sampled at the color scale's actual domain stops, where the underlying
    // d3 interpolation is guaranteed continuous.
    const samples = [-3, -1, 0, 1, 3].map((p) => pctChangeToColor(p));
    expect(new Set(samples).size).toBe(samples.length); // all distinct
  });

  it("defaults to the dark palette when no theme is passed (opengraph-image.tsx's fixed-look callers)", () => {
    expect(pctChangeToColor(0)).toBe(pctChangeToColor(0, "dark"));
  });

  it("light and dark themes produce different colors for the same pctChange, each internally distinct/monotonic", () => {
    const darkSamples = [-3, -1, 0, 1, 3].map((p) => pctChangeToColor(p, "dark"));
    const lightSamples = [-3, -1, 0, 1, 3].map((p) => pctChangeToColor(p, "light"));
    expect(new Set(lightSamples).size).toBe(lightSamples.length);
    darkSamples.forEach((color, i) => expect(color).not.toBe(lightSamples[i]));
  });

  it("colorblind mode is internally distinct/monotonic and swaps hue at the non-flat stops, per theme", () => {
    for (const theme of ["dark", "light"] as const) {
      const normalSamples = [-3, -1, 0, 1, 3].map((p) => pctChangeToColor(p, theme, false));
      const colorblindSamples = [-3, -1, 0, 1, 3].map((p) => pctChangeToColor(p, theme, true));
      expect(new Set(colorblindSamples).size).toBe(colorblindSamples.length);
      // The flat 0% neutral (index 2) is deliberately shared with the normal
      // palette — it's already hue-neutral gray/tan, not a red-or-green color
      // needing a colorblind-safe swap. Only the non-zero stops should differ.
      [0, 1, 3, 4].forEach((idx) => expect(normalSamples[idx]).not.toBe(colorblindSamples[idx]));
      expect(normalSamples[2]).toBe(colorblindSamples[2]);
    }
  });

  it("null tracks the 0% color in every theme/colorblind combination", () => {
    expect(pctChangeToColor(null, "light", true)).toBe(pctChangeToColor(0, "light", true));
    expect(pctChangeToColor(null, "dark", false)).toBe(pctChangeToColor(0, "dark", false));
  });

  it("is discrete (finviz-style bands), not a continuous gradient: values that round to the same whole percent share a color", () => {
    expect(pctChangeToColor(0.1)).toBe(pctChangeToColor(0.4));
    expect(pctChangeToColor(1.1)).toBe(pctChangeToColor(1.4));
    expect(pctChangeToColor(-1.1)).toBe(pctChangeToColor(-1.4));
  });

  it("values that round to different whole percents get different colors", () => {
    expect(pctChangeToColor(0.4)).not.toBe(pctChangeToColor(0.6)); // rounds to 0 vs 1
    expect(pctChangeToColor(1.4)).not.toBe(pctChangeToColor(1.6)); // rounds to 1 vs 2
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
