import { and, asc, desc, eq, gte, inArray, lt, lte, sql } from "drizzle-orm";
import type { Db } from "./client";
import {
  dailyQuotes,
  companyProfiles,
  companyFinancials,
  marketSnapshot,
  indexForeignFlow,
  dailyIndexForeignFlow,
  stockForeignFlow,
  disclosures,
  corporateActions,
  historicalQuotes,
  blockSales,
  newsItems,
  newsOutletLogos,
  botPosts,
  nasdaqQuotes,
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

/** Every company_financials row — same one-query-for-everything shape as getCompanyProfiles. */
export async function getCompanyFinancials(db: Db) {
  return db.select().from(companyFinancials);
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

/** The most recent `limit` *daily* index-level net foreign flow rows, oldest first (for charting) — see dailyIndexForeignFlow's schema comment for why this only carries netValue, not a buy/sell split. */
export async function getDailyIndexForeignFlowHistory(db: Db, limit = 30) {
  const rows = await db.select().from(dailyIndexForeignFlow).orderBy(desc(dailyIndexForeignFlow.periodEnd)).limit(limit);
  return rows.reverse();
}

/** The single most recent daily net foreign flow row, or undefined if none recorded yet. */
export async function getLatestDailyIndexForeignFlow(db: Db) {
  const [row] = await db.select().from(dailyIndexForeignFlow).orderBy(desc(dailyIndexForeignFlow.periodEnd)).limit(1);
  return row;
}

/**
 * Upserts one trading day's total net foreign flow. onConflictDoUpdate (not
 * onConflictDoNothing) so re-running the same day's ETL job — e.g. after a
 * fix, or PSE republishing a revised report — corrects that day's figure
 * rather than leaving the first-seen value stuck.
 */
export async function upsertDailyIndexForeignFlow(db: Db, periodEnd: string, netValue: number) {
  await db
    .insert(dailyIndexForeignFlow)
    .values({ periodEnd, netValue: Math.round(netValue) })
    .onConflictDoUpdate({ target: dailyIndexForeignFlow.periodEnd, set: { netValue: Math.round(netValue) } });
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

// ---- Per-trading-day reads for the /daily recap pages ----------------------

/** The most recent `limit` snapshot dates on record, newest first — the site's notion of "trading days". */
export async function getRecentSnapshotDates(db: Db, limit = 60) {
  const rows = await db
    .select({ snapshotDate: marketSnapshot.snapshotDate })
    .from(marketSnapshot)
    .orderBy(desc(marketSnapshot.snapshotDate))
    .limit(limit);
  return rows.map((r) => r.snapshotDate);
}

export async function getMarketSnapshotByDate(db: Db, date: string) {
  const [row] = await db.select().from(marketSnapshot).where(eq(marketSnapshot.snapshotDate, date)).limit(1);
  return row;
}

/** The `limit` most recent snapshot rows on or before `date`, oldest first (for charting a trailing PSEi trend on the /daily recap). */
export async function getMarketSnapshotHistory(db: Db, date: string, limit = 30) {
  const rows = await db
    .select()
    .from(marketSnapshot)
    .where(lte(marketSnapshot.snapshotDate, date))
    .orderBy(desc(marketSnapshot.snapshotDate))
    .limit(limit);
  return rows.reverse();
}

export async function getDailyQuotesByDate(db: Db, date: string) {
  return db.select().from(dailyQuotes).where(eq(dailyQuotes.tradeDate, date));
}

/** Distinct trade dates with quotes on record, newest first — the market-map time machine's picker options. */
export async function getAvailableQuoteDates(db: Db, limit = 90) {
  const rows = await db
    .selectDistinct({ tradeDate: dailyQuotes.tradeDate })
    .from(dailyQuotes)
    .orderBy(desc(dailyQuotes.tradeDate))
    .limit(limit);
  return rows.map((r) => r.tradeDate);
}

export async function getBlockSalesByDate(db: Db, date: string) {
  return db.select().from(blockSales).where(eq(blockSales.tradeDate, date)).orderBy(desc(blockSales.value));
}

export async function getStockForeignFlowByDate(db: Db, date: string) {
  return db
    .select()
    .from(stockForeignFlow)
    .where(eq(stockForeignFlow.periodEnd, date))
    .orderBy(asc(stockForeignFlow.rank));
}

/** Disclosures filed within [from, to) — callers pass a Manila-day window since filed_at is a timestamp. */
export async function getDisclosuresBetween(db: Db, from: Date, to: Date) {
  return db
    .select()
    .from(disclosures)
    .where(and(gte(disclosures.filedAt, from), lt(disclosures.filedAt, to)))
    .orderBy(desc(disclosures.filedAt));
}

/** News published within [from, to), newest first — same Manila-day window convention as getDisclosuresBetween. */
export async function getNewsBetween(db: Db, from: Date, to: Date) {
  return db
    .select()
    .from(newsItems)
    .where(and(gte(newsItems.publishedAt, from), lt(newsItems.publishedAt, to)))
    .orderBy(desc(newsItems.publishedAt));
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

/**
 * Every cached outlet-logo row (see newsOutletLogos' schema comment), keyed
 * by `source` for O(1) lookup — fetch-news.ts reads this once per run rather
 * than querying per-article, since the whole point is not re-deriving the
 * same outlet's logo dozens of times in one run.
 */
export async function getNewsOutletLogos(db: Db): Promise<Map<string, string>> {
  const rows = await db.select().from(newsOutletLogos);
  return new Map(rows.map((r) => [r.source, r.logoUrl]));
}

/** Caches one outlet's resolved logo URL — upserts on `source` so a re-run after a bad lookup can overwrite it. */
export async function upsertNewsOutletLogo(db: Db, source: string, logoUrl: string) {
  await db
    .insert(newsOutletLogos)
    .values({ source, logoUrl, fetchedAt: new Date() })
    .onConflictDoUpdate({
      target: newsOutletLogos.source,
      set: { logoUrl: sql`excluded.logo_url`, fetchedAt: sql`excluded.fetched_at` },
    });
}

/** The bot's recorded post for one trading day, or undefined if it hasn't posted yet — see etl/jobs/post-daily-tweet.ts. */
export async function getBotPostByDate(db: Db, date: string) {
  const [row] = await db.select().from(botPosts).where(eq(botPosts.postDate, date)).limit(1);
  return row;
}

/** Every nasdaq_quotes row — same one-query-for-everything shape as getCompanyProfiles; apps/web/lib/nasdaq100.ts indexes by ticker client-side. */
export async function getNasdaqQuotes(db: Db) {
  return db.select().from(nasdaqQuotes);
}

/**
 * Bulk upsert, one call for the whole day's fetch rather than one round-trip
 * per ticker. onConflictDoUpdate (not onConflictDoNothing): a ticker that
 * already has a row from a previous run should have its price/change/cap
 * corrected, not left stuck on the first value ever fetched.
 */
export async function upsertNasdaqQuotes(
  db: Db,
  rows: { ticker: string; price: number; pctChange: number; marketCap: number }[]
) {
  if (rows.length === 0) return;
  const fetchedAt = new Date();
  await db
    .insert(nasdaqQuotes)
    .values(
      rows.map((r) => ({
        ticker: r.ticker,
        price: r.price.toString(),
        pctChange: r.pctChange.toString(),
        marketCap: r.marketCap.toString(),
        fetchedAt,
      }))
    )
    .onConflictDoUpdate({
      target: nasdaqQuotes.ticker,
      set: {
        price: sql`excluded.price`,
        pctChange: sql`excluded.pct_change`,
        marketCap: sql`excluded.market_cap`,
        fetchedAt: sql`excluded.fetched_at`,
      },
    });
}
