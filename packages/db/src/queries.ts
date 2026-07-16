import { desc, eq, gte } from "drizzle-orm";
import type { Db } from "./client";
import { dailyQuotes, newsItems } from "./schema";

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
 * Recent news rows (ticker-tagged or not), newest first. Callers group by
 * `tickers` client-side — one query for every box in the market map is cheaper
 * than a per-ticker roundtrip for a treemap with 100+ boxes.
 */
export async function getRecentTaggedNews(db: Db, days = 30, limit = 500) {
  const since = new Date(Date.now() - days * 86_400_000);
  return db
    .select()
    .from(newsItems)
    .where(gte(newsItems.publishedAt, since))
    .orderBy(desc(newsItems.publishedAt))
    .limit(limit);
}
