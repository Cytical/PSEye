import { scaleLinear } from "d3-scale";
import { interpolateRgb } from "d3-interpolate";

export type ColorTheme = "light" | "dark";

/**
 * finviz's actual map (confirmed live) is not a smooth gradient — it's a
 * handful of discrete color steps, one per whole percent, clamped at +/-3%
 * so a few outliers don't wash out the range for everything else. Rather
 * than hand-author 7 more hex values per palette, `pctChangeToColor` snaps
 * the input to the nearest whole percent first (see `bandFor` below) and
 * then evaluates this same continuous d3 scale — so the 7 discrete colors
 * actually used are exactly what this scale already produces at
 * -3/-2/-1/0/1/2/3, just no longer blended for anything in between.
 *
 * finviz's own map is always dark, so a near-black 0% center reads as "flat"
 * against its dark canvas. Once the site's own canvas started following the
 * light/dark theme (see TreemapChart.tsx's CANVAS_BG), that same near-black
 * scale ended up sitting inside a light, warm-paper page for most of the
 * board — day changes cluster near 0%, so most tiles rendered as this
 * near-black/deep-maroon "dark mode" scale regardless of theme, which read
 * as heavy and muddy against a light background. LIGHT_COLOR_RANGE is the
 * same idea with the center inverted (pale near-panel rather than
 * near-black) — extremes stay vivid, and match the site's --up/--down light
 * tokens, so a big mover still reads as unmistakably red/green either way.
 */
const COLOR_DOMAIN = [-3, -1, 0, 1, 3];

/** The 7 discrete bands the map actually renders — see `bandFor`. Also used
 * to draw the legend as discrete swatches instead of a gradient bar. */
export const LEGEND_BANDS = [-3, -2, -1, 0, 1, 2, 3];

/** Snaps a raw pctChange to the nearest whole-percent band, clamped to
 * +/-3% — this is what turns the underlying continuous scale into finviz's
 * discrete steps. */
function bandFor(pctChange: number): number {
  return Math.max(-3, Math.min(3, Math.round(pctChange)));
}

const DARK_COLOR_RANGE = [
  "#f6362f", // <= -3% (bright red)
  "#7a1f27", // -1%
  "#33363d", // 0% (flat, near-black/gray)
  "#1a5c34", // +1%
  "#30cc5a", // >= +3% (bright green)
];

const LIGHT_COLOR_RANGE = [
  "#c23a2e", // <= -3% (matches --down's light-theme value)
  "#e6a89f", // -1% (soft red, dark ink stays legible)
  "#ece7d8", // 0% (flat, warm-paper neutral — near --panel-bg-raised)
  "#a8d6b6", // +1% (soft green, dark ink stays legible)
  "#1c8a4b", // >= +3% (matches --up's light-theme value)
];

/**
 * finviz's own "Colorblind Mode" checkbox swaps its red/green map for an
 * orange/blue diverging scale (confirmed by toggling it live) — orange/blue
 * is the standard red-green-colorblindness-safe substitute (deuteranopia/
 * protanopia both collapse red and green toward each other; blue and orange
 * stay distinguishable). Same domain/shape as the normal palettes, same flat
 * neutral centers, just the hue swapped at the two ends.
 */
const DARK_COLORBLIND_RANGE = [
  "#e0812a", // <= -3% (vivid orange)
  "#7a4a20", // -1%
  "#33363d", // 0% (flat, same neutral as DARK_COLOR_RANGE)
  "#1c4a6b", // +1%
  "#2f8fd6", // >= +3% (vivid blue)
];

const LIGHT_COLORBLIND_RANGE = [
  "#c2661e", // <= -3% (vivid orange)
  "#e8c19b", // -1% (soft orange/tan, dark ink stays legible)
  "#ece7d8", // 0% (flat, same neutral as LIGHT_COLOR_RANGE)
  "#a7c8e0", // +1% (soft blue, dark ink stays legible)
  "#1c6ea4", // >= +3% (vivid blue)
];

function buildScale(range: string[]) {
  return scaleLinear<string>().domain(COLOR_DOMAIN).range(range).interpolate(interpolateRgb).clamp(true);
}

const scales = {
  dark: buildScale(DARK_COLOR_RANGE),
  light: buildScale(LIGHT_COLOR_RANGE),
  "dark-colorblind": buildScale(DARK_COLORBLIND_RANGE),
  "light-colorblind": buildScale(LIGHT_COLORBLIND_RANGE),
};

/** Distinct from the flat (0%) color so an N/A tile doesn't read as "unchanged" in either theme. */
export const NO_DATA_COLOR = "#5b5e66";

/**
 * `theme` defaults to "dark" and `colorblind` to `false` so callers that
 * render one fixed look regardless of the visitor's site preferences
 * (opengraph-image.tsx's static share-image card) don't need to pass
 * anything; TreemapChart.tsx passes the visitor's live theme/colorblind
 * settings explicitly.
 */
export function pctChangeToColor(pctChange: number | null, theme: ColorTheme = "dark", colorblind = false): string {
  if (pctChange === null) return NO_DATA_COLOR;
  const key = colorblind ? (`${theme}-colorblind` as const) : theme;
  return scales[key](bandFor(pctChange));
}

function srgbToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Parses either "#rrggbb" hex or the "rgb(r, g, b)" strings interpolateRgb produces. */
function parseColor(color: string): [number, number, number] {
  if (color.startsWith("#")) {
    return [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16)];
  }
  const match = color.match(/rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/);
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : [0, 0, 0];
}

function relativeLuminance(color: string): number {
  const [r, g, b] = parseColor(color);
  const [lr, lg, lb] = [r, g, b].map(srgbToLinear);
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function contrastRatio(colorA: string, colorB: string): number {
  const la = relativeLuminance(colorA);
  const lb = relativeLuminance(colorB);
  const [lighter, darker] = la > lb ? [la, lb] : [lb, la];
  return (lighter + 0.05) / (darker + 0.05);
}

/** Picks primary ink or white, whichever clears more contrast against a fill color. */
export function getContrastText(fill: string): "#0b0b0b" | "#ffffff" {
  const contrastWithInk = contrastRatio(fill, "#0b0b0b");
  const contrastWithWhite = contrastRatio(fill, "#ffffff");
  return contrastWithInk >= contrastWithWhite ? "#0b0b0b" : "#ffffff";
}

/** Below this cell size (px), hide the ticker label rather than clip it. */
export const MIN_LABEL_WIDTH = 40;
export const MIN_LABEL_HEIGHT = 24;

export function shouldShowLabel(width: number, height: number): boolean {
  return width >= MIN_LABEL_WIDTH && height >= MIN_LABEL_HEIGHT;
}
