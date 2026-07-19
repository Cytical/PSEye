import { createDb, getAvailableQuoteDates, getDailyQuotesByDate } from "@pseye/db";
import type { PseSector, Quote } from "@pseye/source-quotes";

/**
 * Real-only reads for the market map's time machine (see /api/market-map).
 * No mock fallback, deliberately: a view framed as "the market on this past
 * date" must show what was actually recorded or nothing — same honesty bar
 * as the /daily recaps. daily_quotes keeps every trade date's rows (unique
 * on ticker+trade_date), so any date the quotes ETL has captured renders
 * exactly like it did live, real market caps included.
 */
export async function getQuotesForDate(date: string): Promise<Quote[] | null> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return null;
  try {
    const db = createDb(databaseUrl);
    const rows = await getDailyQuotesByDate(db, date);
    if (rows.length === 0) return null;
    return rows.map((r) => ({
      ticker: r.ticker,
      companyName: r.companyName,
      sector: r.sector as PseSector,
      price: r.price == null ? null : Number(r.price),
      pctChange: r.pctChange == null ? null : Number(r.pctChange),
      marketCap: r.marketCap == null ? 0 : Number(r.marketCap),
    }));
  } catch (err) {
    console.error("getQuotesForDate: DB read failed", err);
    return null;
  }
}

/** Trade dates the time machine can jump to, newest first; [] without a database. */
export async function getQuoteDates(limit = 90): Promise<string[]> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return [];
  try {
    const db = createDb(databaseUrl);
    return await getAvailableQuoteDates(db, limit);
  } catch (err) {
    console.error("getQuoteDates: DB read failed", err);
    return [];
  }
}
