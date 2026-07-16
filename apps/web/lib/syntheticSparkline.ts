import { pseudoNormal } from "@pseye/source-quotes";

/**
 * Deterministic pseudo-random 1-month daily-close series for the market map's
 * hover sparkline (finviz shows a similar mini chart on hover). Reuses the same
 * hash-based walk as MockHistoricalQuoteSource, but decoupled from the PSE
 * Quote type so it also works for the Nasdaq 100 mock dataset. Purely a
 * display placeholder, not meant to resemble any real price history.
 */
export function generateSparklineHistory(ticker: string, anchorPrice: number, days = 22): number[] {
  const dailyVol = 0.013;

  let relative = 1;
  const relatives: number[] = [];
  for (let i = 0; i < days; i++) {
    relative *= 1 + dailyVol * pseudoNormal(`${ticker}:${i}`);
    relatives.push(relative);
  }

  const scale = anchorPrice / relatives[relatives.length - 1];
  return relatives.map((r) => Math.round(r * scale * 100) / 100);
}
