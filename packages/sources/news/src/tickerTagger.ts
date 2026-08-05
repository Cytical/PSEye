import { PSE_EDGE_COMPANIES } from "@pseye/source-quotes";

/**
 * Hand-picked short/common names for the tickers most likely to actually
 * appear in casual PH business-news prose — a headline says "Jollibee," not
 * "Jollibee Foods Corporation." These merge with (and take priority over)
 * the auto-derived aliases built below from the full PSE Edge roster, which
 * only ever has each company's formal registered name to work with. Kept
 * short and curated rather than trying to hand-write a brand alias for all
 * 282 companies — most are unambiguous enough by their formal name alone.
 */
export const TICKER_DICTIONARY: Record<string, string[]> = {
  BDO: ["BDO Unibank", "BDO"],
  BPI: ["Bank of the Philippine Islands", "BPI"],
  MBT: ["Metropolitan Bank", "Metrobank"],
  SECB: ["Security Bank"],
  JFC: ["Jollibee Foods", "Jollibee"],
  URC: ["Universal Robina"],
  MER: ["Manila Electric Company", "Meralco"],
  SM: ["SM Investments"],
  AC: ["Ayala Corporation"],
  JGS: ["JG Summit"],
  GTCAP: ["GT Capital"],
  SMPH: ["SM Prime Holdings", "SM Prime"],
  ALI: ["Ayala Land"],
  MEG: ["Megaworld"],
  RLC: ["Robinsons Land"],
  TEL: ["PLDT"],
  GLO: ["Globe Telecom"],
  ICT: ["International Container Terminal", "ICTSI"],
  NIKL: ["Nickel Asia"],
  SCC: ["Semirara Mining"],
};

/** Below this length a suffix-stripped name is too short a substring to
 * trust (risk of matching unrelated text) — see buildAliasMap's comment.
 * Nothing in the real roster lands close to this boundary by accident; it
 * exists as a guardrail for whatever company gets added next. */
const MIN_STRIPPED_ALIAS_LENGTH = 6;

/**
 * Strips a trailing legal suffix so "Ayala Land, Inc." also matches on
 * "Ayala Land" — casual news prose drops the legal suffix far more often
 * than it keeps it. Deliberately narrow (Inc./Incorporated/Corporation/
 * Corp. only), not also "Holdings"/"Company"/"Group": those are often a
 * load-bearing part of how a company is actually referred to (e.g. "SM
 * Prime Holdings", "Philippine Trust Company") and stripping them risked
 * either an unrecognizable leftover or a collision with an unrelated firm.
 */
function stripCorporateSuffix(name: string): string {
  return name.replace(/,?\s*(Incorporated|Inc\.?|Corporation|Corp\.?)\s*$/i, "").trim();
}

/**
 * Extends tagging from the ~20 hand-picked names above to the entire
 * 282-company PSE Edge roster: every company gets its own formal name (and,
 * when long enough to be unambiguous, its suffix-stripped short form) as a
 * match alias, merged with any hand-picked aliases for that ticker. Before
 * this, a news item about any company outside the hand-picked 20 was
 * structurally untaggable no matter how clearly the article named it — the
 * single biggest gap between this and how an actual finance news platform
 * tags stories by company.
 */
function buildAliasMap(): Record<string, string[]> {
  const aliases: Record<string, string[]> = {};
  for (const company of PSE_EDGE_COMPANIES) {
    const forTicker = new Set<string>(TICKER_DICTIONARY[company.ticker] ?? []);
    forTicker.add(company.companyName);
    const stripped = stripCorporateSuffix(company.companyName);
    if (stripped.length >= MIN_STRIPPED_ALIAS_LENGTH) forTicker.add(stripped);
    aliases[company.ticker] = Array.from(forTicker);
  }
  return aliases;
}

const ALIAS_MAP = buildAliasMap();

export function tagTickers(text: string): string[] {
  const haystack = text.toLowerCase();
  const matches = new Set<string>();

  for (const [ticker, aliases] of Object.entries(ALIAS_MAP)) {
    if (aliases.some((alias) => haystack.includes(alias.toLowerCase()))) {
      matches.add(ticker);
    }
  }

  return Array.from(matches);
}
