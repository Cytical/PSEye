import { describe, expect, it } from "vitest";
import {
  MIN_LABEL_HEIGHT,
  MIN_LABEL_WIDTH,
  TIMEFRAME_RANGE,
  bandFor,
  fitTileLabel,
  fitTileLabelAtZoom,
  getContrastText,
  legendStepsFor,
  MIN_TICKER_FONT_SIZE,
  noDataColor,
  pctChangeToColor,
  shouldShowLabel,
  TICKER_FONT_LADDER,
} from "./color";

describe("pctChangeToColor", () => {
  // Reverses the 2026-07-29 decision to collapse these two states. Measured on
  // the live board 2026-08-06: 144 of 280 tiles were untraded and every one of
  // them was claiming a fabricated "+0.00%" in the same neutral as a genuine
  // flat close. See NO_DATA_COLORS in color.ts.
  it("colors a null (no trade) distinctly from a flat 0% close", () => {
    expect(pctChangeToColor(null)).not.toBe(pctChangeToColor(0));
    expect(pctChangeToColor(null)).toBe(noDataColor());
  });

  it("uses the theme's own no-data fill in every theme/colorblind combination", () => {
    for (const theme of ["dark", "light"] as const) {
      for (const colorblind of [false, true]) {
        expect(pctChangeToColor(null, theme, colorblind)).toBe(noDataColor(theme, colorblind));
        expect(pctChangeToColor(null, theme, colorblind)).not.toBe(pctChangeToColor(0, theme, colorblind));
      }
    }
  });

  it("clamps beyond +/-3% rather than extrapolating past the domain", () => {
    expect(pctChangeToColor(10)).toBe(pctChangeToColor(3));
    expect(pctChangeToColor(-10)).toBe(pctChangeToColor(-3));
  });

  it("defaults to the dark palette when no theme is passed (opengraph-image.tsx's fixed-look callers)", () => {
    expect(pctChangeToColor(0)).toBe(pctChangeToColor(0, "dark"));
  });

  // The whole point of the 41-step LUT: sub-1% moves have to be visible,
  // because that is where most PSE day changes live. Under the old
  // round-to-whole-percent banding every one of these pairs was identical.
  it("resolves sub-1% moves that the old 7-band scale collapsed into one color", () => {
    for (const theme of ["dark", "light"] as const) {
      expect(pctChangeToColor(0.41, theme)).not.toBe(pctChangeToColor(-0.22, theme));
      expect(pctChangeToColor(0.1, theme)).not.toBe(pctChangeToColor(0.4, theme));
      expect(pctChangeToColor(1.1, theme)).not.toBe(pctChangeToColor(1.4, theme));
    }
  });

  it("does not jump across the old rounding boundaries any harder than elsewhere", () => {
    // 0.41 -> 0.83 straddled the old 0.5 boundary and produced a dramatic jump
    // while 0.1 -> 0.4 produced none. Both are now ~3 LUT steps apart.
    const a = pctChangeToColor(0.41);
    const b = pctChangeToColor(0.83);
    expect(a).not.toBe(b);
  });

  it("is monotonic in perceived greenness across the full domain", () => {
    for (const theme of ["dark", "light"] as const) {
      const samples = Array.from({ length: 61 }, (_, i) => pctChangeToColor(-3 + i * 0.1, theme));
      // Never reverses direction: every step is the same color or a later one
      // in the LUT, never an earlier one.
      const distinct = samples.filter((c, i) => i === 0 || c !== samples[i - 1]);
      expect(new Set(distinct).size).toBe(distinct.length);
      expect(distinct.length).toBeGreaterThan(20);
    }
  });

  it("uses far more than the 8 distinct colors the banded scale produced", () => {
    const samples = Array.from({ length: 201 }, (_, i) => pctChangeToColor(-3 + i * 0.03));
    expect(new Set(samples).size).toBe(41);
  });

  it("preserves the 7 finviz anchor colors dark mode already shipped", () => {
    expect(pctChangeToColor(-3)).toBe("#f63538");
    expect(pctChangeToColor(-2)).toBe("#bf4045");
    expect(pctChangeToColor(-1)).toBe("#8b444e");
    expect(pctChangeToColor(0)).toBe("#414554");
    expect(pctChangeToColor(1)).toBe("#35764e");
    expect(pctChangeToColor(2)).toBe("#2f9e4f");
    expect(pctChangeToColor(3)).toBe("#30cc5a");
  });

  it("light and dark themes produce different colors for the same pctChange", () => {
    const darkSamples = [-3, -1, 0, 1, 3].map((p) => pctChangeToColor(p, "dark"));
    const lightSamples = [-3, -1, 0, 1, 3].map((p) => pctChangeToColor(p, "light"));
    expect(new Set(lightSamples).size).toBe(lightSamples.length);
    darkSamples.forEach((color, i) => expect(color).not.toBe(lightSamples[i]));
  });

  it("colorblind mode swaps hue at the non-flat stops but shares the neutral, per theme", () => {
    for (const theme of ["dark", "light"] as const) {
      const normalSamples = [-3, -1, 0, 1, 3].map((p) => pctChangeToColor(p, theme, false));
      const colorblindSamples = [-3, -1, 0, 1, 3].map((p) => pctChangeToColor(p, theme, true));
      expect(new Set(colorblindSamples).size).toBe(colorblindSamples.length);
      // Index 2 is the flat 0% neutral, deliberately shared: it is already
      // hue-neutral gray/tan, not a red-or-green needing a safe substitute.
      [0, 1, 3, 4].forEach((idx) => expect(normalSamples[idx]).not.toBe(colorblindSamples[idx]));
      expect(normalSamples[2]).toBe(colorblindSamples[2]);
    }
  });

  it("widens the saturation window for longer timeframes", () => {
    // A +5% move is full-scale on the 1D window but only mid-scale on 1W.
    expect(pctChangeToColor(5, "dark", false, TIMEFRAME_RANGE["1D"])).toBe(pctChangeToColor(3));
    expect(pctChangeToColor(5, "dark", false, TIMEFRAME_RANGE["1W"])).not.toBe(pctChangeToColor(3));
    // The neutral is the neutral at every range.
    for (const range of Object.values(TIMEFRAME_RANGE)) {
      expect(pctChangeToColor(0, "dark", false, range)).toBe("#414554");
    }
  });
});

describe("legendStepsFor / bandFor", () => {
  it("produces the familiar whole-percent steps at the default range", () => {
    expect(legendStepsFor()).toEqual([-3, -2, -1, 0, 1, 2, 3]);
  });

  it("scales its steps with the saturation window and always includes an exact zero", () => {
    expect(legendStepsFor(6)).toEqual([-6, -4, -2, 0, 2, 4, 6]);
    expect(legendStepsFor(10)[3]).toBe(0);
    expect(legendStepsFor(10)).toHaveLength(7);
  });

  it("snaps to a value the legend actually draws, so a band click can never miss", () => {
    for (const range of [3, 6, 10]) {
      const steps = legendStepsFor(range);
      for (const pct of [-99, -4.2, -1.1, -0.4, 0, 0.4, 1.1, 4.2, 99]) {
        expect(steps).toContain(bandFor(pct, range));
      }
    }
  });

  it("still matches the old round-and-clamp behavior at the default range", () => {
    for (const pct of [-9, -3.4, -2.6, -1.2, -0.4, 0, 0.4, 1.2, 2.6, 3.4, 9]) {
      expect(bandFor(pct)).toBe(Math.max(-3, Math.min(3, Math.round(pct))));
    }
  });
});

/** Local copy of the WCAG math, so the assertion below doesn't depend on
 * color.ts exporting its internals. Accepts the "rgb(r, g, b)" strings d3's
 * Lab interpolation produces as well as hex. */
function contrastWithWhite(color: string): number {
  const [r, g, b] = color.startsWith("#")
    ? [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16))
    : color.match(/[\d.]+/g)!.slice(0, 3).map(Number);
  const lin = (c: number) => (c / 255 <= 0.03928 ? c / 255 / 12.92 : Math.pow((c / 255 + 0.055) / 1.055, 2.4));
  const luminance = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return 1.05 / (luminance + 0.05);
}

function rampContrasts(theme: "dark" | "light", colorblind: boolean): number[] {
  return Array.from({ length: 61 }, (_, i) => contrastWithWhite(pctChangeToColor(-3 + i * 0.1, theme, colorblind)));
}

// Tile labels are white at every fill in both themes (TILE_INK), so a fill's
// job is no longer "be far from whichever ink wins" — it is specifically to
// stay dark enough for white, with TILE_LABEL_HALO supplying the rest of the
// margin. Note that finviz's own dark ramp, which this borrows verbatim and
// which finviz itself labels in white, bottoms out at 2.1:1 at the bright end
// of the green arm, so the bar here can't be a WCAG threshold.
describe("white-ink legibility", () => {
  it("keeps every stop in every palette above the floor the halo can carry", () => {
    for (const theme of ["dark", "light"] as const) {
      for (const colorblind of [false, true]) {
        expect(Math.min(...rampContrasts(theme, colorblind))).toBeGreaterThanOrEqual(2);
      }
    }
  });

  // The regression this exists to catch: the light ramp was tuned for near-black
  // ink, so its flat neutral sat at 1.7:1 against white — worse than anything
  // in the dark palette, on the tiles the map has the most of.
  it("makes light mode no worse for white ink than the dark palette it borrows", () => {
    for (const colorblind of [false, true]) {
      expect(Math.min(...rampContrasts("light", colorblind))).toBeGreaterThanOrEqual(
        Math.min(...rampContrasts("dark", colorblind)),
      );
    }
  });

  // The untraded fill is a deliberate exception in light mode: it has to recede
  // toward the page background, which caps how dark it can go. It still clears
  // the floor for the short "n/a" these tiles carry.
  it("keeps the no-data fills readable enough for their own short label", () => {
    for (const theme of ["dark", "light"] as const) {
      expect(contrastWithWhite(noDataColor(theme))).toBeGreaterThanOrEqual(2.5);
    }
  });
});

describe("getContrastText", () => {
  it("picks white ink for a pure black fill and black ink for a pure white fill", () => {
    expect(getContrastText("#000000")).toBe("#ffffff");
    expect(getContrastText("#ffffff")).toBe("#0b0b0b");
  });

  it("stays legible against both themes' no-data fills", () => {
    expect(getContrastText(noDataColor("dark"))).toBe("#ffffff");
    expect(getContrastText(noDataColor("light"))).toBe("#0b0b0b");
  });
});

describe("shouldShowLabel", () => {
  it("hides the label below the minimum box dimensions and shows it at/above them", () => {
    expect(shouldShowLabel(MIN_LABEL_WIDTH - 1, MIN_LABEL_HEIGHT)).toBe(false);
    expect(shouldShowLabel(MIN_LABEL_WIDTH, MIN_LABEL_HEIGHT - 1)).toBe(false);
    expect(shouldShowLabel(MIN_LABEL_WIDTH, MIN_LABEL_HEIGHT)).toBe(true);
    expect(shouldShowLabel(200, 200)).toBe(true);
  });
});

describe("fitTileLabel", () => {
  it("gives a big tile a big ticker and a paired percent line", () => {
    const fit = fitTileLabel(300, 200, "BDO");
    expect(fit.tickerSize).toBe(36);
    expect(fit.changeSize).not.toBeNull();
    expect(fit.changeSize!).toBeLessThan(fit.tickerSize!);
    expect(fit.showPercentGlyph).toBe(true);
  });

  it("degrades to ticker-only rather than dropping the label entirely", () => {
    // Wide enough for a ticker, too short to stack a second line under it.
    const fit = fitTileLabel(60, 17, "SMPH");
    expect(fit.tickerSize).not.toBeNull();
    expect(fit.changeSize).toBeNull();
  });

  it("returns a bare tile below the minimum dimensions", () => {
    const fit = fitTileLabel(20, 10, "ICT");
    expect(fit.tickerSize).toBeNull();
    expect(fit.changeSize).toBeNull();
  });

  it("drops the percent glyph on narrow tiles to reclaim width", () => {
    expect(fitTileLabel(30, 40, "AC").showPercentGlyph).toBe(false);
    expect(fitTileLabel(90, 40, "AC").showPercentGlyph).toBe(true);
  });

  // Labels no longer scale with the map (see LABEL_COUNTER_SCALE), so a size
  // chosen here is the size a visitor reads at every zoom level — a sub-10px
  // rung would be permanently illegible rather than temporarily small.
  it("never picks a font size below the legibility floor", () => {
    for (const [w, h] of [[28, 16], [34, 18], [40, 22], [60, 17], [300, 200]] as const) {
      const fit = fitTileLabel(w, h, "SPNEC");
      for (const size of [fit.tickerSize, fit.changeSize]) {
        if (size != null) expect(size).toBeGreaterThanOrEqual(MIN_TICKER_FONT_SIZE);
      }
    }
    expect(Math.min(...TICKER_FONT_LADDER)).toBe(MIN_TICKER_FONT_SIZE);
  });

  it("gives a longer ticker a smaller size in the same box", () => {
    const short = fitTileLabel(100, 60, "AC");
    const long = fitTileLabel(100, 60, "SPNEC");
    expect(long.tickerSize!).toBeLessThanOrEqual(short.tickerSize!);
  });
});

describe("fitTileLabelAtZoom", () => {
  it("is plain fitTileLabel at 1x", () => {
    for (const [w, h] of [[300, 200], [60, 40], [30, 18], [10, 8]] as const) {
      expect(fitTileLabelAtZoom(w, h, 1, "BDO")).toEqual(fitTileLabel(w, h, "BDO"));
    }
  });

  // The behaviour the whole two-fit split exists for: a visitor zooming in to
  // find a small-cap must not have every other label on the board grow too.
  it("keeps a tile's ticker at one size no matter how far the map is zoomed", () => {
    const sizes = [1, 1.7, 3, 5.6, 10].map((z) => fitTileLabelAtZoom(120, 70, z, "AGI").tickerSize);
    expect(new Set(sizes).size).toBe(1);
    expect(sizes[0]).toBe(fitTileLabel(120, 70, "AGI").tickerSize);
  });

  it("reveals a ticker that does not fit at rest once zoom makes room for one", () => {
    // 12x7 is a sliver: nothing at 1x, readable at 6x.
    expect(fitTileLabelAtZoom(12, 7, 1, "PX").tickerSize).toBeNull();
    expect(fitTileLabelAtZoom(12, 7, 6, "PX").tickerSize).toBe(MIN_TICKER_FONT_SIZE);
  });

  it("gives a revealed sliver the ladder floor, not the size its zoomed box could carry", () => {
    // At 10x this box is 120x70 on screen, which fitTileLabel would happily
    // give 20px type. It gets the floor instead: there is no 1x size to hold.
    expect(fitTileLabel(120, 70, "PX").tickerSize).toBeGreaterThan(MIN_TICKER_FONT_SIZE);
    expect(fitTileLabelAtZoom(12, 7, 10, "PX").tickerSize).toBe(MIN_TICKER_FONT_SIZE);
  });

  it("still drops the percent line on a tile with no room to stack one", () => {
    expect(fitTileLabelAtZoom(60, 17, 1, "SMPH").changeSize).toBeNull();
  });
});
