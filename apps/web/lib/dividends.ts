import { createDb, getCashDividends } from "@pseye/db";
import { MockCorporateActionSource } from "@pseye/source-corporate-actions";
import type { Quote } from "@pseye/source-quotes";
import { getDailyQuotes } from "./quotes";

/** One cash-dividend declaration, as stored by the corporate-actions ETL. */
export interface CashDividendInput {
  ticker: string;
  exDate: string;
  paymentDate: string | null;
  details: string;
}

export interface DividendScreenerRow {
  ticker: string;
  companyName: string;
  sector: string;
  /** null mirrors Quote.price — no trade to report, render "N/A". */
  price: number | null;
  /** Sum of parsed common-share cash dividends with ex-dates in the trailing 12 months, ₱/share. */
  ttmDividend: number;
  /** ttmDividend / price, as a percentage; null when price is null or no payouts parsed. */
  yieldPct: number | null;
  /** How many trailing-12-month payouts went into ttmDividend. */
  payoutCount: number;
  /** Soonest future ex-date on record, if any — "buy before this date to get the next payout". */
  nextExDate: string | null;
  /** Parsed ₱/share amount of that next payout; null when unparseable. */
  nextAmount: number | null;
}

export interface DividendScreenerResult {
  source: "real" | "mock";
  /** Earliest tracked ex-date — lets the page say "history since X" honestly. Null when no past rows. */
  coverageStart: string | null;
  rows: DividendScreenerRow[];
}

/**
 * PSE Edge's dividend "rate" strings are wildly inconsistent — observed live:
 * "P0.35/share", "Php1.00", "Php 0.042114 per share", bare "1.40", even ".45".
 * Preferred-series payouts carry a "(SERIES)" suffix (see parseDividends.ts)
 * and don't apply per common share, so they're rejected rather than parsed;
 * same for the occasional USD-denominated rate (can't yield against a peso
 * price) and percent-of-par rates.
 */
export function parseDividendAmount(details: string): number | null {
  if (details.includes("(")) return null; // preferred/non-common series
  if (/\$|usd/i.test(details)) return null;
  if (details.includes("%")) return null;

  const m = details.match(/(\d+(?:,\d{3})*(?:\.\d+)?|\.\d+)/);
  if (!m) return null;
  const amount = Number(m[1].replace(/,/g, ""));
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Pure aggregation so it's unit-testable without a DB: joins dividend rows
 * onto the quote roster and computes trailing-12-month totals + the next
 * upcoming ex-date per ticker. Only tickers with at least one parseable
 * common-share cash dividend (past or upcoming) make the screener — it's a
 * list of dividend payers, not the whole exchange.
 */
export function buildDividendScreener(
  quotes: Quote[],
  dividends: CashDividendInput[],
  todayIso: string
): DividendScreenerRow[] {
  const windowStart = addDaysIso(todayIso, -365);
  const quoteByTicker = new Map(quotes.map((q) => [q.ticker, q]));

  const byTicker = new Map<string, CashDividendInput[]>();
  for (const div of dividends) {
    if (!quoteByTicker.has(div.ticker)) continue;
    let list = byTicker.get(div.ticker);
    if (!list) {
      list = [];
      byTicker.set(div.ticker, list);
    }
    list.push(div);
  }

  const rows: DividendScreenerRow[] = [];
  for (const [ticker, divs] of byTicker) {
    const quote = quoteByTicker.get(ticker)!;

    let ttmDividend = 0;
    let payoutCount = 0;
    let nextExDate: string | null = null;
    let nextAmount: number | null = null;

    for (const div of divs) {
      const amount = parseDividendAmount(div.details);
      if (div.exDate <= todayIso) {
        if (amount !== null && div.exDate >= windowStart) {
          ttmDividend += amount;
          payoutCount += 1;
        }
      } else if (nextExDate === null || div.exDate < nextExDate) {
        nextExDate = div.exDate;
        nextAmount = amount;
      }
    }

    if (payoutCount === 0 && nextExDate === null) continue;

    const yieldPct =
      quote.price != null && quote.price > 0 && ttmDividend > 0
        ? (ttmDividend / quote.price) * 100
        : null;

    rows.push({
      ticker,
      companyName: quote.companyName,
      sector: quote.sector,
      price: quote.price,
      ttmDividend,
      yieldPct,
      payoutCount,
      nextExDate,
      nextAmount,
    });
  }

  // Default order: yield desc, yield-less rows (upcoming-only payers) last by ticker.
  rows.sort((a, b) => {
    if (a.yieldPct === null && b.yieldPct === null) return a.ticker.localeCompare(b.ticker);
    if (a.yieldPct === null) return 1;
    if (b.yieldPct === null) return -1;
    return b.yieldPct - a.yieldPct;
  });
  return rows;
}

/**
 * DB-backed when DATABASE_URL is configured and the corporate-actions ETL
 * (plus its one-off ~400-day backfill — see etl/jobs/fetch-corporate-actions.ts)
 * has populated it, otherwise a MockCorporateActionSource-derived sample.
 * Falls back on any DB error too — same contract as getDailyQuotes.
 */
export async function getDividendScreener(): Promise<DividendScreenerResult> {
  const todayIso = new Date().toISOString().slice(0, 10);
  const quotes = await getDailyQuotes();
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl) {
    try {
      const db = createDb(databaseUrl);
      const rows = await getCashDividends(db, addDaysIso(todayIso, -365));
      if (rows.length > 0) {
        const pastDates = rows.filter((r) => r.exDate <= todayIso).map((r) => r.exDate);
        return {
          source: "real",
          coverageStart: pastDates.length > 0 ? pastDates.reduce((a, b) => (a < b ? a : b)) : null,
          rows: buildDividendScreener(quotes, rows, todayIso),
        };
      }
    } catch (err) {
      console.error("getDividendScreener: DB read failed, falling back to mock data", err);
    }
  }

  // Mock fallback: the mock corporate actions only carry *upcoming* dividends,
  // so fabricate a plausible trailing year (the same payout repeated 6 and 12
  // months back — PH issuers typically pay semi-annually) purely for layout.
  const upcoming = (await new MockCorporateActionSource().getUpcoming()).filter(
    (a) => a.type === "cash_dividend"
  );
  const synthetic: CashDividendInput[] = upcoming.flatMap((a) => [
    { ticker: a.ticker, exDate: a.exDate, paymentDate: a.paymentDate, details: a.details },
    { ticker: a.ticker, exDate: addDaysIso(a.exDate, -182), paymentDate: null, details: a.details },
    { ticker: a.ticker, exDate: addDaysIso(a.exDate, -365), paymentDate: null, details: a.details },
  ]);
  return {
    source: "mock",
    coverageStart: null,
    rows: buildDividendScreener(quotes, synthetic, todayIso),
  };
}
