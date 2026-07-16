import { desc, eq } from "drizzle-orm";
import type { Db } from "./client";
import { dailyQuotes, companyProfiles } from "./schema";

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
