import { and, asc, desc, eq, gte, inArray } from "drizzle-orm";
import type { Db } from "./client";
import {
  dailyQuotes,
  companyProfiles,
  marketSnapshot,
  indexForeignFlow,
  disclosures,
  corporateActions,
  historicalQuotes,
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

/** Most recent 200 disclosures on record, newest first — plenty for a single-page digest. */
export async function getRecentDisclosures(db: Db) {
  return db.select().from(disclosures).orderBy(desc(disclosures.filedAt)).limit(200);
}

/** All corporate actions on record, soonest ex-date first — the ETL job already windows this to ~recent/upcoming. */
export async function getUpcomingCorporateActions(db: Db) {
  return db.select().from(corporateActions).orderBy(corporateActions.exDate);
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
