import { scaleDiverging } from "d3-scale";
import { interpolateLab, piecewise } from "d3-interpolate";

/**
 * Diverging pair is finance convention (green=up, red=down), not the
 * dataviz-skill's generic blue/red default — the domain override is
 * deliberate. Poles reuse the skill's status "good"/"critical" steps since
 * day % change is literally a good/bad measure; midpoint is the skill's
 * neutral diverging gray for each surface.
 */
const POLE_UP = "#0ca30c";
const POLE_DOWN = "#d03b3b";
const MIDPOINT_LIGHT = "#f0efec";
const MIDPOINT_DARK = "#383835";

function buildScale(midpoint: string, maxAbsPct: number) {
  return scaleDiverging<string>()
    .domain([-maxAbsPct, 0, maxAbsPct])
    .interpolator(piecewise(interpolateLab, [POLE_DOWN, midpoint, POLE_UP]))
    .clamp(true);
}

const lightScale = buildScale(MIDPOINT_LIGHT, 3);
const darkScale = buildScale(MIDPOINT_DARK, 3);

export type ColorMode = "light" | "dark";

/**
 * Maps a day % change to a box fill color. Clamped at +/-3% — most PSE large-caps
 * move well under that on a normal day, so a wider clamp (e.g. +/-6%) leaves nearly
 * every box a barely-tinted near-neutral color and only rare outliers show any hue.
 */
export function pctChangeToColor(pctChange: number, mode: ColorMode = "light"): string {
  return mode === "dark" ? darkScale(pctChange) : lightScale(pctChange);
}

function srgbToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const [lr, lg, lb] = [r, g, b].map(srgbToLinear);
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb;
}

function contrastRatio(hexA: string, hexB: string): number {
  const la = relativeLuminance(hexA);
  const lb = relativeLuminance(hexB);
  const [lighter, darker] = la > lb ? [la, lb] : [lb, la];
  return (lighter + 0.05) / (darker + 0.05);
}

/** Picks primary ink or white, whichever clears more contrast against a fill color. */
export function getContrastText(fillHex: string): "#0b0b0b" | "#ffffff" {
  const contrastWithInk = contrastRatio(fillHex, "#0b0b0b");
  const contrastWithWhite = contrastRatio(fillHex, "#ffffff");
  return contrastWithInk >= contrastWithWhite ? "#0b0b0b" : "#ffffff";
}

/** Below this cell size (px), hide the ticker label rather than clip it. */
export const MIN_LABEL_WIDTH = 40;
export const MIN_LABEL_HEIGHT = 24;

export function shouldShowLabel(width: number, height: number): boolean {
  return width >= MIN_LABEL_WIDTH && height >= MIN_LABEL_HEIGHT;
}
