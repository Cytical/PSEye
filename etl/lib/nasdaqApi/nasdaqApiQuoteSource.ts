import { fetchWithRetry } from "../fetchWithRetry";

const USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export interface NasdaqQuote {
  ticker: string;
  price: number;
  pctChange: number;
  marketCap: number;
}

/**
 * Nasdaq's own public quote API, the same JSON backing nasdaq.com's own
 * market-activity pages — confirmed live (2026-08-08) to work from a plain
 * server-side fetch with just a browser User-Agent header, no API key.
 * Stooq was tried first (the originally free, no-key source this job was
 * planned around) and turned out to be a dead end: its bulk quote endpoint
 * (`/q/l/`) now 404s, and its CSV historical endpoint (`/q/d/l/`) sits behind
 * a JavaScript proof-of-work anti-bot challenge that a server-side fetch
 * can't pass without reimplementing (and defeating) that challenge.
 *
 * No single endpoint here has everything, so this is two requests per
 * ticker: `/info` has the last sale price and today's % change, `/summary`
 * has market cap (and, redundantly, previous close). Run once daily for 100
 * tickers this is 200 requests total — fine for a once-a-day job, but see
 * fetch-nasdaq100.ts for the delay between calls that keeps this polite.
 */
export async function fetchNasdaqQuote(ticker: string): Promise<NasdaqQuote | null> {
  const symbol = ticker.toLowerCase();
  const headers = { "User-Agent": USER_AGENT, Accept: "application/json" };

  const [infoRes, summaryRes] = await Promise.all([
    fetchWithRetry(`https://api.nasdaq.com/api/quote/${symbol}/info?assetclass=stocks`, { headers }),
    fetchWithRetry(`https://api.nasdaq.com/api/quote/${symbol}/summary?assetclass=stocks`, { headers }),
  ]);
  if (!infoRes || !summaryRes) return null;

  try {
    const info = await infoRes.json();
    const summary = await summaryRes.json();

    const price = parseMoney(info?.data?.primaryData?.lastSalePrice);
    const pctChange = parsePercent(info?.data?.primaryData?.percentageChange);
    const marketCap = parseMoney(summary?.data?.summaryData?.MarketCap?.value);

    if (price == null || pctChange == null || marketCap == null) {
      console.error(`fetchNasdaqQuote: incomplete data for ${ticker} (price=${price}, pctChange=${pctChange}, marketCap=${marketCap})`);
      return null;
    }
    return { ticker, price, pctChange, marketCap };
  } catch (err) {
    console.error(`fetchNasdaqQuote: failed to parse response for ${ticker}`, err);
    return null;
  }
}

/** Strips "$"/"," from fields like "$313.33" or "4,572,794,419,400". "N/A" (a suspended/halted ticker) returns null rather than 0. */
function parseMoney(raw: unknown): number | null {
  if (typeof raw !== "string" || raw === "N/A" || raw === "") return null;
  const n = Number(raw.replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : null;
}

/** Strips "%"/"+" from fields like "+0.29%" or "-1.42%". */
function parsePercent(raw: unknown): number | null {
  if (typeof raw !== "string" || raw === "N/A" || raw === "") return null;
  const n = Number(raw.replace(/[%+,]/g, ""));
  return Number.isFinite(n) ? n : null;
}
