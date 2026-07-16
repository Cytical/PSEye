import { createDb, getRecentTaggedNews } from "@pseye/db";

export interface CompanyNewsItem {
  title: string;
  url: string;
  source: string;
  /** ISO string, not a Date — plain, serializable across the server/client component boundary. */
  publishedAt: string;
}

const MAX_ITEMS_PER_TICKER = 5;

/**
 * Ticker -> recent news items, built from one query against the DB the news
 * ETL job already populates hourly (see etl/jobs/fetch-news.ts) — the same
 * "swap source without touching callers" contract as getDailyQuotes, and
 * the same reason: falls back to {} (no company news, not a fabricated
 * headline) rather than breaking the page on a missing/misconfigured DB.
 */
export async function getNewsByTicker(): Promise<Record<string, CompanyNewsItem[]>> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return {};

  try {
    const db = createDb(databaseUrl);
    const rows = await getRecentTaggedNews(db);

    const byTicker: Record<string, CompanyNewsItem[]> = {};
    for (const row of rows) {
      for (const ticker of row.tickers) {
        const items = (byTicker[ticker] ??= []);
        if (items.length < MAX_ITEMS_PER_TICKER) {
          items.push({
            title: row.title,
            url: row.url,
            source: row.source,
            publishedAt: row.publishedAt.toISOString(),
          });
        }
      }
    }
    return byTicker;
  } catch (err) {
    console.error("getNewsByTicker: DB read failed, falling back to no company news", err);
    return {};
  }
}
