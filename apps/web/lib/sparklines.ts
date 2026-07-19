import { createDb, getHistoricalQuotes } from "@pseye/db";

/**
 * Real trailing-month closes per ticker for the market map's hover sparkline.
 * Real-only, no mock fallback: tickers without DB history are simply absent
 * and the tooltip skips its sparkline — this replaced a synthetic random walk
 * that was being presented under a "1M" label (see TreemapChart.tsx), which
 * failed the same honesty bar that keeps StockPriceChart real-only.
 *
 * One bulk query for the whole roster (~97 tickers × ~22 closes) is a few KB
 * of props — cheap next to shipping a fake chart.
 */
export async function getRealSparklines(tickers: string[], days = 31): Promise<Record<string, number[]>> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl || tickers.length === 0) return {};
  try {
    const db = createDb(databaseUrl);
    const from = new Date();
    from.setUTCDate(from.getUTCDate() - days);
    const rows = await getHistoricalQuotes(db, tickers, from.toISOString().slice(0, 10));
    const byTicker: Record<string, number[]> = {};
    for (const r of rows) {
      (byTicker[r.ticker] ??= []).push(Number(r.close));
    }
    // A one-point "line" renders as nothing useful — drop those tickers too.
    for (const [ticker, closes] of Object.entries(byTicker)) {
      if (closes.length < 2) delete byTicker[ticker];
    }
    return byTicker;
  } catch (err) {
    console.error("getRealSparklines: DB read failed — hover sparklines will be omitted", err);
    return {};
  }
}
