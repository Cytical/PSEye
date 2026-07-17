import { createDb, getRecentBlockSales as getRecentBlockSalesQuery } from "@pseye/db";
import { MockBlockSaleSource, type BlockSale } from "@pseye/source-block-sales";

export interface BlockSalesResult {
  /** Whether `trades` is real DB-backed data or the MockBlockSaleSource fallback — lets
   * the page show a "sample data" caveat only when it's actually true. */
  source: "real" | "mock";
  trades: BlockSale[];
}

/**
 * DB-backed when DATABASE_URL is configured and the daily ETL job
 * (etl/jobs/fetch-block-sales.ts, PseQuotationReportBlockSaleSource — real
 * data extracted from PSE's own Daily Quotation Report PDF) has populated
 * it, otherwise MockBlockSaleSource. Falls back on any DB error too — same
 * contract as getDailyQuotes.
 */
export async function getBlockSales(): Promise<BlockSalesResult> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return { source: "mock", trades: await new MockBlockSaleSource().getLatest() };

  try {
    const db = createDb(databaseUrl);
    const rows = await getRecentBlockSalesQuery(db);
    if (rows.length === 0) return { source: "mock", trades: await new MockBlockSaleSource().getLatest() };

    return {
      source: "real",
      trades: rows.map((r) => ({
        ticker: r.ticker,
        companyName: r.companyName,
        tradeDate: r.tradeDate,
        volume: r.volume,
        price: Number(r.price),
        value: r.value,
      })),
    };
  } catch (err) {
    console.error("getBlockSales: DB read failed, falling back to mock data", err);
    return { source: "mock", trades: await new MockBlockSaleSource().getLatest() };
  }
}
