import {
  createDb,
  getBlockSalesByDate,
  getDailyQuotesByDate,
  getDisclosuresBetween,
  getMarketSnapshotByDate,
  getMarketSnapshotHistory,
  getNewsBetween,
  getRecentSnapshotDates,
  getStockForeignFlowByDate,
} from "@pseye/db";
import { histogram, mean, percentile, stdev, type HistogramBin } from "./analytics";

export interface RecapMover {
  ticker: string;
  companyName: string;
  price: number;
  pctChange: number;
}

export interface RecapFlowRow {
  ticker: string;
  companyName: string;
  netValue: number;
}

export interface RecapBlockSale {
  ticker: string;
  companyName: string;
  volume: number;
  price: number;
  value: number;
}

export interface RecapDisclosure {
  ticker: string;
  companyName: string;
  headline: string;
  filedAt: string;
  url: string | null;
}

export interface RecapNewsItem {
  title: string;
  url: string;
  source: string;
}

export interface PseiHistoryPoint {
  date: string;
  pseiValue: number;
}

export interface DailyRecap {
  date: string;
  snapshot: { pseiValue: number; pseiChange: number; pseiPctChange: number } | null;
  /** Trailing PSEi close trend ending on this date, oldest first — for the share card's mini chart. */
  pseiHistory: PseiHistoryPoint[];
  /** Market breadth across every tracked stock that day. */
  breadth: {
    advancers: number;
    decliners: number;
    unchanged: number;
    noTrade: number;
    /** Cross-sectional stats over that day's traded (non-null) % changes — same shape as /market-stats's "today" breadth, just for this specific date instead of the live snapshot. */
    medianMove: number | null;
    meanMove: number | null;
    moveStdev: number | null;
    positivePct: number | null;
    histogram: HistogramBin[];
  } | null;
  gainers: RecapMover[];
  losers: RecapMover[];
  foreignBuys: RecapFlowRow[];
  foreignSells: RecapFlowRow[];
  blockSales: RecapBlockSale[];
  disclosures: RecapDisclosure[];
  news: RecapNewsItem[];
  prevDate: string | null;
  nextDate: string | null;
}

/** PSE trades on Manila time — a recap "day" is the Manila calendar day, not UTC's. */
function manilaDayWindow(date: string): { from: Date; to: Date } {
  const from = new Date(`${date}T00:00:00+08:00`);
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);
  return { from, to };
}

const MOVER_COUNT = 5;
// 90 (vs. the original 30) gives the now-zoomable PseiTrendChart a
// meaningful range to actually zoom into rather than just a slightly longer
// sparkline — one row/day in market_snapshot, so still a cheap query.
const PSEI_HISTORY_DAYS = 90;

/**
 * Everything the site recorded for one trading day, joined from the tables the
 * scheduled ETL jobs already populate — no new collection, just a per-date cut.
 * Returns null when there's no database or the date has nothing on record
 * (callers 404). No mock fallback, deliberately: a recap page frames itself as
 * "what actually happened on this date", the same honesty bar as
 * StockPriceChart only rendering real closes.
 */
export async function getDailyRecap(date: string): Promise<DailyRecap | null> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return null;

  try {
    const db = createDb(databaseUrl);
    const { from, to } = manilaDayWindow(date);
    const [snapshotRow, quoteRows, flowRows, blockRows, disclosureRows, newsRows, snapshotDates, historyRows] =
      await Promise.all([
        getMarketSnapshotByDate(db, date),
        getDailyQuotesByDate(db, date),
        getStockForeignFlowByDate(db, date),
        getBlockSalesByDate(db, date),
        getDisclosuresBetween(db, from, to),
        getNewsBetween(db, from, to),
        getRecentSnapshotDates(db, 120),
        getMarketSnapshotHistory(db, date, PSEI_HISTORY_DAYS),
      ]);

    if (!snapshotRow && quoteRows.length === 0 && disclosureRows.length === 0 && blockRows.length === 0) {
      return null;
    }

    const traded = quoteRows
      .filter((r) => r.price != null && r.pctChange != null)
      .map((r) => ({
        ticker: r.ticker,
        companyName: r.companyName,
        price: Number(r.price),
        pctChange: Number(r.pctChange),
      }));
    const byPctDesc = [...traded].sort((a, b) => b.pctChange - a.pctChange);

    const todayPct = traded.map((r) => r.pctChange);
    const breadth =
      quoteRows.length > 0
        ? {
            advancers: traded.filter((r) => r.pctChange > 0).length,
            decliners: traded.filter((r) => r.pctChange < 0).length,
            unchanged: traded.filter((r) => r.pctChange === 0).length,
            noTrade: quoteRows.length - traded.length,
            medianMove: percentile(todayPct, 50),
            meanMove: todayPct.length ? mean(todayPct) : null,
            moveStdev: todayPct.length >= 2 ? stdev(todayPct) : null,
            positivePct: todayPct.length
              ? (traded.filter((r) => r.pctChange > 0).length / todayPct.length) * 100
              : null,
            histogram: histogram(todayPct, 31),
          }
        : null;

    // snapshotDates is newest-first; neighbors are found by comparison rather
    // than index so a date with quotes but no snapshot row still gets nav links.
    const prevDate = snapshotDates.find((d) => d < date) ?? null;
    const nextDate = [...snapshotDates].reverse().find((d) => d > date) ?? null;

    return {
      date,
      snapshot: snapshotRow
        ? {
            pseiValue: Number(snapshotRow.pseiValue),
            pseiChange: Number(snapshotRow.pseiChange),
            pseiPctChange: Number(snapshotRow.pseiPctChange),
          }
        : null,
      breadth,
      pseiHistory: historyRows.map((r) => ({ date: r.snapshotDate, pseiValue: Number(r.pseiValue) })),
      gainers: byPctDesc.filter((r) => r.pctChange > 0).slice(0, MOVER_COUNT),
      losers: byPctDesc
        .filter((r) => r.pctChange < 0)
        .slice(-MOVER_COUNT)
        .reverse(),
      foreignBuys: flowRows
        .filter((r) => r.netValue > 0)
        .map((r) => ({ ticker: r.ticker, companyName: r.companyName, netValue: r.netValue })),
      foreignSells: flowRows
        .filter((r) => r.netValue < 0)
        .map((r) => ({ ticker: r.ticker, companyName: r.companyName, netValue: r.netValue })),
      blockSales: blockRows.map((r) => ({
        ticker: r.ticker,
        companyName: r.companyName,
        volume: r.volume,
        price: Number(r.price),
        value: r.value,
      })),
      disclosures: disclosureRows.map((r) => ({
        ticker: r.ticker,
        companyName: r.companyName,
        headline: r.headline,
        filedAt: r.filedAt.toISOString(),
        url: r.url,
      })),
      news: newsRows.slice(0, 6).map((r) => ({ title: r.title, url: r.url, source: r.source })),
      prevDate,
      nextDate,
    };
  } catch (err) {
    console.error("getDailyRecap: DB read failed", err);
    return null;
  }
}

/** Recent trading days that have a recap to show, newest first; [] without a database. */
export async function getRecentRecapDates(limit = 30): Promise<string[]> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return [];
  try {
    const db = createDb(databaseUrl);
    return await getRecentSnapshotDates(db, limit);
  } catch (err) {
    console.error("getRecentRecapDates: DB read failed", err);
    return [];
  }
}

export interface RecapIndexEntry {
  date: string;
  pseiValue: number;
  pseiChange: number;
  pseiPctChange: number;
}

/** Recent trading days with their PSEi close, newest first — the `/daily` archive
 * index. `/daily` used to `redirect()` to the newest date instead of listing
 * anything, but a `redirect()` inside a prerendered route can't emit an HTTP 3xx,
 * so Next bakes it into the HTML as a `<meta http-equiv="refresh">` — which Google
 * reads as a redirect on a URL that is both sitemapped and self-canonical, and
 * reports under "Redirect error". Listing the days for real keeps the route a
 * genuine 200 and gives the per-day pages an internal-linking hub. */
export async function getRecentRecapIndex(limit = 60): Promise<RecapIndexEntry[]> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return [];
  try {
    const db = createDb(databaseUrl);
    const [latest] = await getRecentSnapshotDates(db, 1);
    if (!latest) return [];
    const rows = await getMarketSnapshotHistory(db, latest, limit);
    // getMarketSnapshotHistory returns oldest-first (it feeds a chart); the
    // archive reads newest-first.
    return rows
      .map((r) => ({
        date: r.snapshotDate,
        pseiValue: Number(r.pseiValue),
        pseiChange: Number(r.pseiChange),
        pseiPctChange: Number(r.pseiPctChange),
      }))
      .reverse();
  } catch (err) {
    console.error("getRecentRecapIndex: DB read failed", err);
    return [];
  }
}
