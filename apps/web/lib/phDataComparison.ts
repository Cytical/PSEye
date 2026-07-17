import { getDailyQuotes } from "./quotes";
import { PseEdgeQuoteSource } from "@pseye/source-quotes";

export type PhComparisonStatus = "match" | "na-mismatch" | "price-drift" | "pct-drift";

export interface PhComparisonRow {
  ticker: string;
  companyName: string;
  dbPrice: number | null;
  livePrice: number | null;
  dbPctChange: number | null;
  livePctChange: number | null;
  status: PhComparisonStatus;
}

export interface PhComparisonResult {
  rows: PhComparisonRow[];
  matchCount: number;
  naMismatchCount: number;
  driftCount: number;
}

// Rounding tolerance, not a market-moved-in-between-fetches tolerance —
// price-drift rows are expected (this re-scrape happens later than the last
// ETL run) and are reported as informational, not folded into "match".
const EPSILON = 0.005;

function numbersEqual(a: number | null, b: number | null): boolean {
  if (a === null || b === null) return a === b;
  return Math.abs(a - b) < EPSILON;
}

/**
 * Cross-checks the DB's stored PH quotes (what the market map renders)
 * against a fresh, independent re-scrape of PSE Edge done right now. This
 * only verifies the DB write path and catches staleness — since both sides
 * ultimately go through the same parser, it can't catch a bug baked into
 * parseStockData.ts itself (that's what the vitest fixtures are for).
 *
 * Deliberately not called automatically on every /test page load: it makes
 * one live request per tracked ticker (~97) against PSE Edge, so it's opt-in
 * from the page (see the "Run live comparison" link) rather than run on
 * every visit.
 */
export async function comparePhQuotes(): Promise<PhComparisonResult> {
  const [dbQuotes, liveQuotes] = await Promise.all([
    getDailyQuotes(),
    new PseEdgeQuoteSource().getDailyQuotes(),
  ]);

  const liveByTicker = new Map(liveQuotes.map((q) => [q.ticker, q]));

  const rows: PhComparisonRow[] = dbQuotes.map((db) => {
    const live = liveByTicker.get(db.ticker);
    const livePrice = live?.price ?? null;
    const livePctChange = live?.pctChange ?? null;

    let status: PhComparisonStatus = "match";
    if ((db.price === null) !== (livePrice === null)) {
      status = "na-mismatch";
    } else if (!numbersEqual(db.price, livePrice)) {
      status = "price-drift";
    } else if (!numbersEqual(db.pctChange, livePctChange)) {
      status = "pct-drift";
    }

    return {
      ticker: db.ticker,
      companyName: db.companyName,
      dbPrice: db.price,
      livePrice,
      dbPctChange: db.pctChange,
      livePctChange,
      status,
    };
  });

  return {
    rows,
    matchCount: rows.filter((r) => r.status === "match").length,
    naMismatchCount: rows.filter((r) => r.status === "na-mismatch").length,
    driftCount: rows.filter((r) => r.status === "price-drift" || r.status === "pct-drift").length,
  };
}
