/**
 * Normalizes the `details` string on a CorporateAction for display.
 *
 * That field is PSE Edge's own "Rate" cell copied verbatim (see
 * parseDividends.ts), and PSE Edge is not consistent about it — the same
 * column yields "P0.35/share", "Php1.00", "Php 0.042114 per share", bare
 * "1.40", and even ".45" across different filings, plus a "(SERIES)" suffix
 * for preferred shares. Rendering that raw means the single number a visitor
 * came to the dividend calendar for shows up with three different currency
 * spellings, or none at all.
 *
 * Distinct from parseDividendAmount in ./dividends, which answers a different
 * question — "what per-common-share peso amount can I compute a yield from?"
 * — and therefore *rejects* preferred series, percentages, and USD rates. This
 * one has to render whatever the exchange published, so it keeps those and
 * only tidies the parts it can recognize.
 *
 * Deliberately a display-layer transform rather than a change to the parser:
 * the stored value stays exactly what the exchange published, so a re-scrape
 * diff still compares like for like.
 */

/**
 * "[currency] [number] [unit] [(series)]" — every part but the number is
 * optional. Anchored end-to-end so anything with leftover content ("5%",
 * "TBA", "1-for-8 rights offer at P38.00/share") fails to match and is
 * returned untouched rather than mangled by an over-eager regex.
 */
const RATE = new RegExp(
  "^" +
    "(?:php|p|₱)?\\s*" + // optional currency spelling
    "(\\d[\\d,]*(?:\\.\\d+)?|\\.\\d+)" + // the amount, incl. a bare ".45"
    "\\s*(/\\s*share|per\\s+share)?" + // optional per-share unit
    "\\s*(\\([^()]*\\))?" + // optional "(SERIES)" for preferred shares
    "$",
  "i",
);

/**
 * Trims trailing zeros but keeps at least 2 decimals, so ₱1.20 stays ₱1.20
 * while ₱0.042114 keeps its full precision — dividend rates are declared to
 * however many places the board approved, and rounding them would misstate
 * the payout.
 */
function formatAmount(raw: string): string {
  const value = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(value)) return raw;
  const declared = raw.includes(".") ? raw.split(".")[1].replace(/0+$/, "").length : 0;
  return value.toLocaleString("en-PH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: Math.max(2, declared),
  });
}

export function formatCorporateActionRate(details: string): string {
  const trimmed = details.trim();
  const match = trimmed.match(RATE);
  if (!match) return trimmed;

  const [, amount, unit, series] = match;
  return `₱${formatAmount(amount)}${unit ? "/share" : ""}${series ? ` ${series}` : ""}`;
}
