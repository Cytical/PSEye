import { scaleLinear } from "d3-scale";
import { interpolateRgb } from "d3-interpolate";

/**
 * Bright, continuous finviz-style gradient — finviz's map interpolates
 * smoothly from a near-black flat color out to saturated red/green at the
 * extremes, rather than a handful of discrete buckets. Clamped at +/-3% so a
 * handful of outliers don't wash out the color range for everything else.
 * The market map's canvas is always dark (see TreemapChart.tsx) so this
 * doesn't need separate light/dark variants.
 */
const COLOR_DOMAIN = [-3, -1, 0, 1, 3];

const COLOR_RANGE = [
  "#f6362f", // <= -3% (bright red)
  "#7a1f27", // -1%
  "#33363d", // 0% (flat, near-black/gray)
  "#1a5c34", // +1%
  "#30cc5a", // >= +3% (bright green)
];

export const COLOR_DOMAIN_MIN = COLOR_DOMAIN[0];
export const COLOR_DOMAIN_MAX = COLOR_DOMAIN[COLOR_DOMAIN.length - 1];

const scale = scaleLinear<string>().domain(COLOR_DOMAIN).range(COLOR_RANGE).interpolate(interpolateRgb).clamp(true);

/** Distinct from the near-black "flat" (0%) color so an N/A tile doesn't read as "unchanged." */
export const NO_DATA_COLOR = "#5b5e66";

export function pctChangeToColor(pctChange: number | null): string {
  if (pctChange === null) return NO_DATA_COLOR;
  return scale(pctChange);
}

/**
 * CSS gradient reproducing the exact same scale (same domain/range/interpolation
 * as `scale` above), for rendering the legend as a smooth bar rather than
 * discrete swatches. Stop positions are the domain values re-projected onto
 * [0%, 100%].
 */
export const LEGEND_GRADIENT_CSS = `linear-gradient(to right, ${COLOR_RANGE.map((color, i) => {
  const pct = ((COLOR_DOMAIN[i] - COLOR_DOMAIN_MIN) / (COLOR_DOMAIN_MAX - COLOR_DOMAIN_MIN)) * 100;
  return `${color} ${pct}%`;
}).join(", ")})`;

export const LEGEND_TICKS = [-3, -1.5, 0, 1.5, 3];

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
