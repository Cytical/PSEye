import "../lib/loadEnv";
import { createDb, upsertNasdaqQuotes } from "@pseye/db";
import { fetchNasdaqQuote, type NasdaqQuote } from "../lib/nasdaqApi/nasdaqApiQuoteSource";
import { triggerRevalidate } from "../lib/triggerRevalidate";

/**
 * Nasdaq 100 ticker roster, matching apps/web/lib/nasdaq100.ts's
 * NASDAQ_100_STOCKS (same tickers, same order). Kept as a plain list here
 * rather than importing that file directly — it lives in apps/web, an app,
 * not a workspace package other packages import from, same reasoning as
 * PSE_EDGE_COMPANIES living in @pseye/source-quotes instead of apps/web. That
 * file still owns companyName/sector/description as static metadata; this
 * job only needs to know which tickers to fetch a live quote for. If Nasdaq
 * ever reconstitutes the index (happens roughly once a year in December),
 * update both lists together.
 */
const NASDAQ_100_TICKERS = [
  "AAPL", "MSFT", "NVDA", "AVGO", "GOOGL", "GOOG", "ADBE", "CSCO", "AMD", "QCOM",
  "INTC", "TXN", "AMAT", "INTU", "ADI", "LRCX", "KLAC", "SNPS", "CDNS", "MU",
  "PANW", "CRWD", "FTNT", "MRVL", "NXPI", "ON", "MCHP", "WDAY", "TEAM", "DDOG",
  "ZS", "ANSS", "ARM", "SMCI", "GFS", "ROP", "CTSH", "CDW", "PLTR", "APP",
  "TTD", "VRSN", "MSTR",
  "META", "NFLX", "TMUS", "CMCSA", "CHTR", "WBD", "EA", "SIRI",
  "AMZN", "TSLA", "SBUX", "BKNG", "ABNB", "MAR", "ORLY", "ROST", "DASH", "LULU",
  "EBAY", "PDD", "DLTR", "MELI",
  "PEP", "MDLZ", "KHC", "KDP", "MNST", "WBA", "COST",
  "ISRG", "VRTX", "REGN", "GILD", "AMGN", "BIIB", "MRNA", "IDXX", "DXCM", "GEHC", "ILMN",
  "HON", "CSX", "CTAS", "FAST", "ODFL", "VRSK", "PAYX", "PCAR", "CPRT", "ADP",
  "AEP", "EXC", "XEL", "CEG",
  "LIN", "FANG",
  "PYPL",
];

/** Politeness delay between per-ticker request pairs — 100 tickers at 150ms apart is ~15s total, trivial for a once-daily job. */
const REQUEST_DELAY_MS = 150;

/**
 * Runs daily via .github/workflows/nasdaq100-daily.yml (workflow_dispatch
 * only, called by an external cron-job.org job — see that workflow's doc
 * comment and CLAUDE.md's Triggering note for why every cron here bypasses
 * GitHub's own `schedule:` queue). Fetches a live quote per ticker from
 * Nasdaq's own quote API (see nasdaqApiQuoteSource.ts), skipping — not
 * zeroing out — any ticker whose fetch fails, so a bad run leaves that
 * ticker's existing row untouched rather than wiping it.
 */
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const db = createDb(databaseUrl);
  const quotes: NasdaqQuote[] = [];

  for (const ticker of NASDAQ_100_TICKERS) {
    const quote = await fetchNasdaqQuote(ticker);
    if (quote) {
      quotes.push(quote);
    } else {
      console.warn(`fetch-nasdaq100: no quote for ${ticker} this run, leaving any existing row untouched.`);
    }
    await sleep(REQUEST_DELAY_MS);
  }

  if (quotes.length === 0) {
    console.log("fetch-nasdaq100: no quotes fetched, nothing to upsert.");
    return;
  }

  await upsertNasdaqQuotes(db, quotes);
  console.log(`fetch-nasdaq100: upserted ${quotes.length}/${NASDAQ_100_TICKERS.length} quotes.`);

  await triggerRevalidate(["nasdaq-quotes"], ["/"]);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
