import { createDb, getIndexForeignFlowHistory } from "@pseye/db";
import { MockForeignFlowSource, type IndexForeignFlow, type StockForeignFlow } from "@pseye/source-foreign-flow";

export interface ForeignFlowPageData {
  indexFlow: IndexForeignFlow[];
  periodEnd: string;
  topBuying: StockForeignFlow[];
  topSelling: StockForeignFlow[];
}

/**
 * Index-level history is DB-backed when DATABASE_URL is configured and the
 * weekly ETL job (etl/jobs/fetch-foreign-flow.ts, PseMarketWatchForeignFlowSource)
 * has populated it, falling back to MockForeignFlowSource on any DB error or
 * empty table — same contract as getDailyQuotes.
 *
 * Per-stock top-buying/top-selling is always MockForeignFlowSource — no free
 * public source for that was found (see fetch-foreign-flow.ts's doc
 * comment). Kept separate from the index-level fallback rather than
 * bundled into one "real vs mock" flag, since one is genuinely real and the
 * other genuinely isn't, regardless of DATABASE_URL.
 */
export async function getForeignFlowPageData(): Promise<ForeignFlowPageData> {
  const mock = new MockForeignFlowSource();
  const { periodEnd, topBuying, topSelling } = await mock.getTopStockFlows();

  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl) {
    try {
      const db = createDb(databaseUrl);
      const rows = await getIndexForeignFlowHistory(db, 12);
      if (rows.length > 0) {
        return {
          indexFlow: rows.map((r) => ({
            periodEnd: r.periodEnd,
            foreignBuyValue: r.foreignBuyValue,
            foreignSellValue: r.foreignSellValue,
            netValue: r.netValue,
          })),
          periodEnd,
          topBuying,
          topSelling,
        };
      }
    } catch (err) {
      console.error("getForeignFlowPageData: DB read failed, falling back to mock index flow", err);
    }
  }

  return { indexFlow: await mock.getIndexFlow(), periodEnd, topBuying, topSelling };
}
