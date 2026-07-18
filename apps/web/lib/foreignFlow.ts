import { createDb, getIndexForeignFlowHistory, getLatestStockForeignFlow } from "@pseye/db";
import { MockForeignFlowSource, type IndexForeignFlow, type StockForeignFlow } from "@pseye/source-foreign-flow";

export interface ForeignFlowPageData {
  indexFlow: IndexForeignFlow[];
  periodEnd: string;
  topBuying: StockForeignFlow[];
  topSelling: StockForeignFlow[];
  stockFlowSource: "real" | "mock";
}

/**
 * Index-level history is DB-backed when DATABASE_URL is configured and the
 * weekly ETL job (etl/jobs/fetch-foreign-flow.ts, PseMarketWatchForeignFlowSource)
 * has populated it, falling back to MockForeignFlowSource on any DB error or
 * empty table — same contract as getDailyQuotes.
 *
 * Per-stock top-buying/top-selling is DB-backed too as of 2026-07 —
 * fetch-block-sales.ts (daily) now extracts a real "Net Foreign
 * Buying/(Selling)" figure per stock from the same Daily Quotation Report it
 * already fetches for block sales (see parseQuotationReportForeignFlow's doc
 * comment for how that was found), so this is genuinely real, daily data
 * now, not the old MockForeignFlowSource weekly top-5. Falls back to mock
 * independently of the index-level fallback (same as before this change),
 * since the two come from different tables/jobs and can go stale
 * independently. `stockFlowSource` lets the page show its "sample data"
 * caveat only when the mock actually fired.
 */
export async function getForeignFlowPageData(): Promise<ForeignFlowPageData> {
  const databaseUrl = process.env.DATABASE_URL;

  let indexFlow: IndexForeignFlow[] | null = null;
  let stockFlow: { periodEnd: string; topBuying: StockForeignFlow[]; topSelling: StockForeignFlow[] } | null = null;

  if (databaseUrl) {
    try {
      const db = createDb(databaseUrl);
      const [indexRows, stockResult] = await Promise.all([
        getIndexForeignFlowHistory(db, 12),
        getLatestStockForeignFlow(db),
      ]);

      if (indexRows.length > 0) {
        indexFlow = indexRows.map((r) => ({
          periodEnd: r.periodEnd,
          foreignBuyValue: r.foreignBuyValue,
          foreignSellValue: r.foreignSellValue,
          netValue: r.netValue,
        }));
      }

      if (stockResult) {
        stockFlow = {
          periodEnd: stockResult.periodEnd,
          topBuying: stockResult.rows
            .filter((r) => r.netValue > 0)
            .map((r) => ({ ticker: r.ticker, companyName: r.companyName, netValue: r.netValue, rank: r.rank })),
          topSelling: stockResult.rows
            .filter((r) => r.netValue < 0)
            .map((r) => ({ ticker: r.ticker, companyName: r.companyName, netValue: r.netValue, rank: r.rank })),
        };
      }
    } catch (err) {
      console.error("getForeignFlowPageData: DB read failed, falling back to mock", err);
    }
  }

  const mock = new MockForeignFlowSource();
  const stockFlowSource: "real" | "mock" = stockFlow ? "real" : "mock";
  if (!indexFlow) indexFlow = await mock.getIndexFlow();
  if (!stockFlow) stockFlow = await mock.getTopStockFlows();

  return { indexFlow, ...stockFlow, stockFlowSource };
}
