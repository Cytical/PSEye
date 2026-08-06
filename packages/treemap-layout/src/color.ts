import { scaleLinear } from "d3-scale";
import { interpolateLab } from "d3-interpolate";

export type ColorTheme = "light" | "dark";
type ScaleKey = "dark" | "light" | "dark-colorblind" | "light-colorblind";

/**
 * The map paints from a 41-entry lookup table per theme, not from a handful of
 * discrete bands.
 *
 * It used to snap every input to the nearest whole percent first (the old
 * `bandFor`-inside-`pctChangeToColor` path), which meant only 7 colors could
 * ever reach the screen. Measured live on 2026-08-06 against the production
 * board: 174 of 280 tiles rendered the *identical* neutral #414554 and the
 * whole map used 8 distinct colors total. Because PSE day changes cluster
 * tightly around zero, that snapping destroyed exactly the signal the map
 * exists to show — MER at +0.41% and SMPH at -0.22% were indistinguishable,
 * while MER at +0.41% and MBT at +0.83% looked wildly different purely because
 * they straddled the 0.5 rounding boundary.
 *
 * finviz solves the same problem on the same +/-3% domain with a 41-step LUT
 * (index = round(scale(value) * 40)), which is near-continuous to the eye but
 * still genuinely quantized. The dark ramps below ARE finviz's LUT, verbatim.
 * Note that its indices 0/7/13/20/27/33/40 are exactly the 7 colors this file
 * already shipped, so nothing about dark mode's established look changes — the
 * gaps between those anchors are simply filled in now.
 */
const LUT_SIZE = 41;
const LAST_INDEX = LUT_SIZE - 1;
/** Index of the flat/0% entry. The LUT is symmetric around it. */
const NEUTRAL_INDEX = 20;

/**
 * The default +/-3% saturation window, i.e. the move at which a tile reaches
 * full red/green. Verified appropriate for the PSE rather than inherited
 * blindly: on a representative session, of the 136 names that actually traded,
 * 33 moved under 0.5%, 30 between 0.5-1%, 54 between 1-3% and 19 over 3%. A
 * tighter window would clip a quarter of the board to the extremes.
 */
export const DEFAULT_SCALE_RANGE = 3;

/**
 * finviz widens its saturation window as the timeframe lengthens (its own
 * `scaleMinMax`), so a 1-month map isn't a solid wall of saturated green. Same
 * idea here, same values for the timeframes this map offers.
 */
export type MapTimeframe = "1D" | "1W" | "1M";
export const TIMEFRAME_RANGE: Record<MapTimeframe, number> = {
  "1D": 3,
  "1W": 6,
  "1M": 10,
};

/**
 * finviz's 41-stop LUT, read out of its own shipped bundle rather than
 * eyedropped. The ramp deliberately does not run red -> black -> green through
 * pure luminance: it pivots through the slate-blue neutral #414554 and both
 * arms hold roughly constant lightness near the middle, which is what lets the
 * extremes pop without the midtones turning muddy brown or olive.
 */
const DARK_LUT = [
  "#f63538", "#ee373a", "#e6393b", "#df3a3d", "#d73c3f", "#ce3d41", "#c73e43",
  "#bf4045", "#b64146", "#ae4248", "#a5424a", "#9d434b", "#94444d", "#8b444e",
  "#824450", "#784551", "#6f4552", "#644553", "#5a4554", "#4f4554",
  "#414554", // 20: flat
  "#3f4c53", "#3d5451", "#3b5a50", "#3a614f", "#38694f", "#366f4e", "#35764e",
  "#347d4e", "#32844e", "#31894e", "#31904e", "#30974f", "#2f9e4f", "#2fa450",
  "#2faa51", "#2fb152", "#2fb854", "#30be56", "#30c558", "#30cc5a",
];

/**
 * finviz's "Colorblind Mode" LUT (orange/blue). Orange/blue is the standard
 * red-green-colorblindness-safe substitute: deuteranopia and protanopia both
 * collapse red and green toward each other, while blue and orange stay
 * distinguishable. Shares the identical #414554 neutral at index 20, so
 * toggling the mode re-hues the map without shifting its overall weight.
 */
const DARK_COLORBLIND_LUT = [
  "#f5820f", "#ec7f12", "#e37c16", "#da7919", "#d1761d", "#c87320", "#bf7024",
  "#b66d27", "#ad6a2b", "#a4672e", "#9b6432", "#926035", "#895d38", "#805a3c",
  "#77573f", "#6e5443", "#655146", "#5c4e4a", "#534b4d", "#4a4851",
  "#414554", // 20: flat
  "#40495c", "#3f4c63", "#3e506b", "#3d5473", "#3d587a", "#3c5b82", "#3b5f8a",
  "#3a6391", "#396699", "#386aa1", "#376ea8", "#3671b0", "#3575b7", "#3479bf",
  "#347dc7", "#3380ce", "#3284d6", "#3188de", "#308be5", "#2f8fed",
];

/**
 * finviz has no light-mode map (confirmed live: its own light/dark toggle only
 * recolors the site chrome, not the heatmap or its legend), so there is no LUT
 * to borrow here — these are hand-tuned anchors, expanded to a full 41-stop
 * ramp by interpolation below.
 *
 * They were rebalanced when tile ink became uniformly white (see TILE_INK). The
 * previous set was tuned the other way round, for near-black ink: its mids sat
 * at ~0.45 relative luminance and its neutral at ~0.59, which put white text on
 * the flat tiles at 1.7:1 — unreadable, halo or no halo. The whole ramp now
 * holds at or under ~0.29 luminance, i.e. at least ~3:1 against white before
 * TILE_LABEL_HALO adds its margin, while staying clearly lighter and warmer
 * than the dark palette so light mode still reads as light mode.
 *
 * Within that constraint:
 * - The two extremes are exactly --down / --up (globals.css), which were
 *   already dark enough to leave untouched.
 * - The two mid tints stay luminance-matched to each other (0.273 vs 0.288), so
 *   a -1% tile and a +1% tile carry equal visual weight rather than the green
 *   reading lighter than its red counterpart.
 * - The flat center is the warm-paper neutral carried down to the same range.
 */
const LIGHT_ANCHOR_DOMAIN = [-3, -1, 0, 1, 3];
const LIGHT_ANCHOR_RANGE = [
  "#b8382c", // <= -3% (--down, light theme)
  "#cb7a68", // -1% (warm red wash)
  "#9c927a", // 0% (flat, warm-paper neutral)
  "#57a173", // +1% (green wash, luminance-matched to the -1% red)
  "#16743f", // >= +3% (--up, light theme)
];

/** Same tuning pass as LIGHT_ANCHOR_RANGE: mids luminance-matched to each other
 * (0.269 vs 0.269) *and* to that palette's own mids, shared neutral. */
const LIGHT_COLORBLIND_ANCHOR_RANGE = [
  "#ad5c1c", // <= -3% (vivid orange)
  "#c07f43", // -1% (orange wash)
  "#9c927a", // 0% (flat, same neutral as LIGHT_ANCHOR_RANGE)
  "#5c94b5", // +1% (blue wash, luminance-matched to the -1% orange)
  "#1c6ea4", // >= +3% (vivid blue)
];

/**
 * Interpolates the 5 light anchors up to a 41-stop LUT so both themes quantize
 * identically. Lab, not RGB: straight RGB interpolation between a warm salmon
 * and a warm khaki runs through a desaturated mud that reads as a third,
 * unintended "color band" in the ramp, whereas Lab keeps perceived lightness
 * moving monotonically between the anchors.
 */
function buildLutFromAnchors(domain: number[], range: string[]): string[] {
  const scale = scaleLinear<string>().domain(domain).range(range).interpolate(interpolateLab).clamp(true);
  const span = domain[domain.length - 1] - domain[0];
  return Array.from({ length: LUT_SIZE }, (_, i) => scale(domain[0] + (span * i) / LAST_INDEX));
}

const LUTS: Record<ScaleKey, string[]> = {
  dark: DARK_LUT,
  "dark-colorblind": DARK_COLORBLIND_LUT,
  light: buildLutFromAnchors(LIGHT_ANCHOR_DOMAIN, LIGHT_ANCHOR_RANGE),
  "light-colorblind": buildLutFromAnchors(LIGHT_ANCHOR_DOMAIN, LIGHT_COLORBLIND_ANCHOR_RANGE),
};

/**
 * "This stock did not trade" is not "this stock closed unchanged", and the map
 * spent a while claiming otherwise.
 *
 * A 2026-07-29 decision collapsed the two, removing this constant and painting
 * a null pctChange as flat 0%. Measured live 2026-08-06, that turned out to
 * cover half the board: 144 of 280 tiles were reporting a fabricated "+0.00%"
 * for names that simply had no fill that session (RRHI, BEL, BCOR, STI, CEU,
 * PORT, SBS, LBC and ~136 others). The map was telling visitors that half the
 * exchange closed flat. Reinstated deliberately.
 *
 * Placement mirrors finviz's own no-data treatment (#2f323d): between the page
 * background and the flat-neutral tile, so untraded names recede without
 * vanishing. The light value does the same against --panel-canvas (#f7f4ee)
 * and its #9c927a neutral, but only just: it has to stay dark enough for the
 * white ink these tiles still carry (see TILE_INK), so it recedes by a step
 * rather than by washing all the way out to the canvas. TreemapChart pairs this
 * with a diagonal hatch so the state survives greyscale, print, and colorblind
 * viewing rather than relying on "a slightly different gray".
 */
const NO_DATA_COLORS: Record<ScaleKey, string> = {
  dark: "#2f323d",
  "dark-colorblind": "#2f323d",
  light: "#aaa189",
  "light-colorblind": "#aaa189",
};

function scaleKey(theme: ColorTheme, colorblind: boolean): ScaleKey {
  return colorblind ? (`${theme}-colorblind` as const) : theme;
}

/** The fill for a stock with no trade to report. See NO_DATA_COLORS. */
export function noDataColor(theme: ColorTheme = "dark", colorblind = false): string {
  return NO_DATA_COLORS[scaleKey(theme, colorblind)];
}

/**
 * `theme` defaults to "dark" and `colorblind` to `false` so callers that render
 * one fixed look regardless of the visitor's site preferences
 * (opengraph-image.tsx's static share-image card) don't need to pass anything;
 * TreemapChart.tsx passes the visitor's live theme/colorblind settings.
 *
 * `range` is the saturation window (see DEFAULT_SCALE_RANGE / TIMEFRAME_RANGE).
 * A null `pctChange` returns the no-data fill, not the flat-0% fill.
 */
export function pctChangeToColor(
  pctChange: number | null,
  theme: ColorTheme = "dark",
  colorblind = false,
  range: number = DEFAULT_SCALE_RANGE,
): string {
  const key = scaleKey(theme, colorblind);
  if (pctChange == null) return NO_DATA_COLORS[key];
  return LUTS[key][lutIndex(pctChange, range)];
}

/** Maps a pctChange onto 0..40, clamped at +/-range. finviz's exact formula. */
function lutIndex(pctChange: number, range: number): number {
  const clamped = Math.max(-range, Math.min(range, pctChange));
  return Math.round(NEUTRAL_INDEX + (clamped / range) * NEUTRAL_INDEX);
}

/**
 * The 7 values the legend draws swatches for, evenly spaced across the
 * saturation window and always including an exact 0 in the middle. At the
 * default +/-3% range this is the familiar [-3..3]; at 1W (+/-6) it becomes
 * [-6,-4,-2,0,2,4,6].
 *
 * Returns exact step values, not display-rounded ones, so `bandFor` and the
 * legend can never disagree about which band a tile belongs to. Round for
 * display at the call site.
 */
export function legendStepsFor(range: number = DEFAULT_SCALE_RANGE): number[] {
  const step = range / 3;
  return [-3, -2, -1, 0, 1, 2, 3].map((k) => k * step);
}

/** The default (+/-3%) legend steps. Kept as a named export because it predates
 * `legendStepsFor` and several call sites read it directly. */
export const LEGEND_BANDS = legendStepsFor();

/**
 * Snaps a raw pctChange to the nearest legend step. No longer used to paint
 * tiles (that is `pctChangeToColor`'s continuous LUT above) — this now exists
 * purely so the interactive legend can answer "does this tile belong to the
 * band the visitor just clicked" using the same arithmetic that positioned the
 * swatch. Snapping in step-space rather than rounding the raw percent keeps it
 * exact at every range.
 */
export function bandFor(pctChange: number, range: number = DEFAULT_SCALE_RANGE): number {
  const step = range / 3;
  const k = Math.max(-3, Math.min(3, Math.round(Math.max(-range, Math.min(range, pctChange)) / step)));
  return k * step;
}

function srgbToLinear(channel: number): number {
  const c = channel / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

/** Parses either "#rrggbb" hex or the "rgb(r, g, b)" strings d3 interpolation produces. */
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

/**
 * Every tile label on the map is white, at every fill, in both themes.
 *
 * Per-tile ink chosen by `getContrastText` is the higher-contrast answer in
 * isolation, but on a 41-step ramp it flips partway along each arm — a column
 * of tiles running from +0.4% to +2.8% would switch from black text to white
 * text somewhere in the middle for no reason a reader can see, and the map
 * stops looking like one surface. finviz draws white on every tile for the same
 * reason. `getContrastText` is still exported and still used where the ink
 * genuinely varies against an arbitrary background.
 *
 * The contrast that a mid-tone fill can't provide comes from TILE_LABEL_HALO
 * below rather than from switching colors.
 */
export const TILE_INK = "#ffffff";

/**
 * A four-way 1px dark halo behind white tile labels, per theme.
 *
 * This is the cartographic solution to text over arbitrary color, and it is
 * what makes a single ink color viable across the whole ramp: white on the
 * light theme's pale #d2c8ac neutral is only ~1.5:1 on its own, but the same
 * white ringed in near-black separates cleanly. The light variant is opaque
 * where the dark one is translucent, because it has more luminance to fight.
 */
export const TILE_LABEL_HALO: Record<ColorTheme, string> = {
  dark: "0 1px 2px rgba(0,0,0,0.75), -1px 0 1px rgba(0,0,0,0.5), 1px 0 1px rgba(0,0,0,0.5), 0 -1px 1px rgba(0,0,0,0.5)",
  light:
    "0 1px 2px rgba(0,0,0,0.9), -1px 0 1px rgba(0,0,0,0.75), 1px 0 1px rgba(0,0,0,0.75), 0 -1px 1px rgba(0,0,0,0.75)",
};

/**
 * Label sizing follows finviz's ladder: try the largest size that fits, and
 * degrade (full label -> ticker only -> bare tile) rather than dropping
 * everything at one hard threshold. The old all-or-nothing 40x24 gate left 211
 * of 280 tiles completely blank on the production board.
 */
export const TICKER_FONT_LADDER = [36, 30, 24, 20, 18, 14, 13, 12, 11, 10];

/**
 * The smallest rung, and the reason the ladder stops there.
 *
 * It used to bottom out at 8px, which made the fit function answer "yes" for
 * tiles nobody could actually read a ticker on: a 28x16 sliver got 8px type,
 * and the map's smallest panels filled with grey specks of text. That was a
 * reasonable trade only while type scaled with the map, since zooming in blew
 * those specks up along with everything else. Labels now hold one constant
 * on-screen size at every zoom level (see LABEL_COUNTER_SCALE in
 * TreemapChart.tsx), so an 8px label would stay 8px forever no matter how far
 * in a visitor zoomed. 10px is the floor worth drawing; below it a tile simply
 * carries no label until zooming has made it big enough to earn one.
 */
export const MIN_TICKER_FONT_SIZE = 10;

/** Horizontal breathing room (px per side) each ladder size needs, keyed by size. */
export const TICKER_FONT_PADDING: Record<number, number> = {
  36: 30, 30: 25, 24: 20, 20: 14, 18: 12, 14: 9, 13: 7, 12: 7,
  11: 4, 10: 3,
};

/**
 * Rough average glyph width as a fraction of font size for the uppercase
 * tickers this map draws. Used to fit a label without a DOM measure pass.
 */
const TICKER_GLYPH_RATIO = 0.62;

/**
 * Rendered line box as a multiple of font size. The renderer sets Tailwind's
 * `leading-tight`, so a label occupies meaningfully more vertical space than
 * its nominal font size — comparing raw font sizes against the tile height
 * overflowed 13 of 95 labelled tiles on the live board.
 */
const LINE_HEIGHT = 1.35;

/** Below this cell size (px), don't even try to draw a ticker. */
export const MIN_LABEL_WIDTH = 28;
export const MIN_LABEL_HEIGHT = 16;

export function shouldShowLabel(width: number, height: number): boolean {
  return width >= MIN_LABEL_WIDTH && height >= MIN_LABEL_HEIGHT;
}

export interface TileLabelFit {
  /** Ticker font size in px, or null when even the smallest ladder step won't fit. */
  tickerSize: number | null;
  /** Percent-change font size in px, or null when only the ticker fits. */
  changeSize: number | null;
  /** finviz's trick: drop the "%" glyph on narrow tiles to reclaim ~5px. */
  showPercentGlyph: boolean;
}

/**
 * Picks the largest ladder size whose estimated text width fits the tile, then
 * the largest paired size for the percent line in whatever height is left.
 * Returns nulls rather than forcing a size, so the caller renders a bare tile.
 */
export function fitTileLabel(width: number, height: number, ticker: string): TileLabelFit {
  const none: TileLabelFit = { tickerSize: null, changeSize: null, showPercentGlyph: false };
  if (!shouldShowLabel(width, height)) return none;

  const tickerSize =
    TICKER_FONT_LADDER.find((size) => {
      const pad = TICKER_FONT_PADDING[size] ?? 2;
      return ticker.length * size * TICKER_GLYPH_RATIO <= width - pad * 2 && size * LINE_HEIGHT <= height;
    }) ?? null;
  if (tickerSize == null) return none;

  // The percent line is roughly half to two-thirds the ticker, never larger,
  // and only appears when both line boxes still clear the tile height.
  const changeSize = TICKER_FONT_LADDER.filter(
    (s) => s <= Math.max(MIN_TICKER_FONT_SIZE, tickerSize * 0.66),
  ).find(
    (s) => (tickerSize + s) * LINE_HEIGHT <= height,
  );

  return {
    tickerSize,
    changeSize: changeSize ?? null,
    showPercentGlyph: width > 32,
  };
}

const NO_LABEL: TileLabelFit = { tickerSize: null, changeSize: null, showPercentGlyph: false };

/**
 * The label a tile carries at a given zoom level.
 *
 * Two questions, deliberately answered against two different sizes:
 *
 * - *Is there a label at all?* Against the tile's on-screen size, so a sliver
 *   too small to label on the resting board reveals its ticker once zooming has
 *   made it big enough to read one. That is the whole point of being able to
 *   zoom into a 280-box treemap.
 * - *How big is it?* Against the tile's size at 1x, so the answer does not
 *   change as the visitor zooms. Fitting the type to the on-screen size instead
 *   meant every label climbed the ladder on the way in: a 11px ticker at rest
 *   became a 36px one four notches later, so the map's typography reflowed
 *   continuously under a gesture whose only job was to make small boxes
 *   reachable. Paired with LABEL_COUNTER_SCALE in TreemapChart.tsx (which
 *   cancels the transform layer's own scale), a tile's ticker is now rendered
 *   at exactly the same pixel size whether the map is at 1x or 10x.
 *
 * A tile with no base fit at all has just been revealed by zooming, so it gets
 * the ladder's floor: there is no 1x answer to preserve.
 *
 * At zoom 1 the two fits are the same call and this returns plain fitTileLabel.
 */
export function fitTileLabelAtZoom(
  width: number,
  height: number,
  zoom: number,
  ticker: string,
): TileLabelFit {
  const onScreen = fitTileLabel(width * zoom, height * zoom, ticker);
  if (onScreen.tickerSize == null) return NO_LABEL;
  const base = fitTileLabel(width, height, ticker);
  return {
    tickerSize: base.tickerSize ?? MIN_TICKER_FONT_SIZE,
    // Whether there's room to stack a percent line is a visibility question
    // (it depends on the on-screen height), but its size is not.
    changeSize: onScreen.changeSize == null ? null : (base.changeSize ?? MIN_TICKER_FONT_SIZE),
    // Not a size: dropping the "%" is an abbreviation for narrow tiles, and a
    // tile that is wide on screen has no reason to stay abbreviated.
    showPercentGlyph: onScreen.showPercentGlyph,
  };
}
