import { and, asc, desc, eq, gte, inArray } from "drizzle-orm";
import type { Db } from "./client";
import {
  dailyQuotes,
  companyProfiles,
  marketSnapshot,
  indexForeignFlow,
  stockForeignFlow,
  disclosures,
  corporateActions,
  historicalQuotes,
  blockSales,
  newsItems,
} from "./schema";

/** All rows for the most recent trade_date on record, or [] if the table is empty. */
export async function getLatestDailyQuotes(db: Db) {
  const [latest] = await db
    .select({ tradeDate: dailyQuotes.tradeDate })
    .from(dailyQuotes)
    .orderBy(desc(dailyQuotes.tradeDate))
    .limit(1);

  if (!latest) return [];

  return db.select().from(dailyQuotes).where(eq(dailyQuotes.tradeDate, latest.tradeDate));
}

/**
 * Every company profile row. One query for every box in the market map is
 * cheaper than a per-ticker roundtrip for a treemap with 100+ boxes — callers
 * index by `ticker` client-side.
 */
export async function getCompanyProfiles(db: Db) {
  return db.select().from(companyProfiles);
}

/** Today's (or the most recently captured) PSEi/forex snapshot, or undefined if the table is empty. */
export async function getLatestMarketSnapshot(db: Db) {
  const [row] = await db.select().from(marketSnapshot).orderBy(desc(marketSnapshot.snapshotDate)).limit(1);
  return row;
}

/** The most recent weekly index-level foreign flow period, or undefined if none recorded yet. */
export async function getLatestIndexForeignFlow(db: Db) {
  const [row] = await db.select().from(indexForeignFlow).orderBy(desc(indexForeignFlow.periodEnd)).limit(1);
  return row;
}

/** The most recent `limit` weekly index-level foreign flow periods, oldest first (for charting). */
export async function getIndexForeignFlowHistory(db: Db, limit = 12) {
  const rows = await db.select().from(indexForeignFlow).orderBy(desc(indexForeignFlow.periodEnd)).limit(limit);
  return rows.reverse();
}

/** Most recent 200 disclosures on record, newest first — plenty for a single-page digest. */
export async function getRecentDisclosures(db: Db) {
  return db.select().from(disclosures).orderBy(desc(disclosures.filedAt)).limit(200);
}

/**
 * Corporate actions from 30 days ago onward, soonest ex-date first. The ETL
 * job only ever inserts within its own ~6-month-forward window, but rows
 * from past runs stay in the table as time passes — without this floor the
 * calendar would keep accumulating actions from further and further in the
 * past on every visit.
 */
export async function getUpcomingCorporateActions(db: Db) {
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - 30);
  const cutoffIso = cutoff.toISOString().slice(0, 10);

  return db
    .select()
    .from(corporateActions)
    .where(gte(corporateActions.exDate, cutoffIso))
    .orderBy(corporateActions.exDate);
}

/**
 * Cash-dividend rows from `fromDate` (by ex-date) onward — past *and*
 * upcoming, in one pass, so the /dividends screener can compute a
 * trailing-12-month total and the next ex-date from the same result set.
 * Depth of past coverage depends on the one-off backfill described in
 * etl/jobs/fetch-corporate-actions.ts.
 */
export async function getCashDividends(db: Db, fromDate: string) {
  return db
    .select()
    .from(corporateActions)
    .where(and(eq(corporateActions.type, "cash_dividend"), gte(corporateActions.exDate, fromDate)))
    .orderBy(asc(corporateActions.exDate));
}

/**
 * Block sale trades from the last 30 days on record, largest trade value
 * first — same cutoff-window shape as getUpcomingCorporateActions, so a
 * years-old megatrade doesn't permanently pin itself to the top of a page
 * framed as "recent" activity.
 */
export async function getRecentBlockSales(db: Db) {
  const cutoff = new Date();
  cutoff.setUTCDate(cutoff.getUTCDate() - 30);
  const cutoffIso = cutoff.toISOString().slice(0, 10);

  return db
    .select()
    .from(blockSales)
    .where(gte(blockSales.tradeDate, cutoffIso))
    .orderBy(desc(blockSales.value));
}

/**
 * Most recent `limit` news items, newest first — generous enough for the
 * news page's own front-page/more-headlines ranking and slicing to work
 * with (see apps/web/lib/news.ts), not meant to be shown in full.
 */
export async function getRecentNews(db: Db, limit = 80) {
  return db.select().from(newsItems).orderBy(desc(newsItems.publishedAt)).limit(limit);
}

/**
 * The single latest periodEnd's stock-level foreign flow rows (rank asc),
 * or null if the table is empty. Since fetch-block-sales.ts stores this
 * daily now (real per-stock "Net Foreign Buying/(Selling)" from the Daily
 * Quotation Report — see its doc comment), periodEnd is a trade date, not a
 * week ending. Callers split into buying/selling by netValue's sign — rank
 * is only meaningful within its own direction (see stock_foreign_flow's
 * schema comment), so a rank=1 row could be either the top buyer or seller.
 */
export async function getLatestStockForeignFlow(db: Db) {
  const [latest] = await db
    .select({ periodEnd: stockForeignFlow.periodEnd })
    .from(stockForeignFlow)
    .orderBy(desc(stockForeignFlow.periodEnd))
    .limit(1);

  if (!latest) return null;

  const rows = await db
    .select()
    .from(stockForeignFlow)
    .where(eq(stockForeignFlow.periodEnd, latest.periodEnd))
    .orderBy(asc(stockForeignFlow.rank));

  return { periodEnd: latest.periodEnd, rows };
}

/** Daily closes for the given tickers from `fromDate` through the most recent one on record, ascending. */
export async function getHistoricalQuotes(db: Db, tickers: string[], fromDate: string) {
  if (tickers.length === 0) return [];
  return db
    .select()
    .from(historicalQuotes)
    .where(and(inArray(historicalQuotes.ticker, tickers), gte(historicalQuotes.tradeDate, fromDate)))
    .orderBy(asc(historicalQuotes.tradeDate));
}
