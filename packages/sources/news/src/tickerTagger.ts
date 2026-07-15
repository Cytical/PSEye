/**
 * Ticker + company-name dictionary used to auto-tag news items. Kept in this
 * package (not imported from @pseye/source-quotes) so news tagging can cover
 * tickers even before they exist in the quotes mock/roster.
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

export function tagTickers(text: string): string[] {
  const haystack = text.toLowerCase();
  const matches = new Set<string>();

  for (const [ticker, aliases] of Object.entries(TICKER_DICTIONARY)) {
    if (aliases.some((alias) => haystack.includes(alias.toLowerCase()))) {
      matches.add(ticker);
    }
  }

  return Array.from(matches);
}
