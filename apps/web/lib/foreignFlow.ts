import {
  createDb,
  getDailyIndexForeignFlowHistory,
  getIndexForeignFlowHistory,
  getLatestStockForeignFlow,
} from "@pseye/db";
import { MockForeignFlowSource, type StockForeignFlow } from "@pseye/source-foreign-flow";

/** One bar's worth of index-level net foreign flow — deliberately net-only (no buy/sell split), since the daily source (see below) only ever has a net figure to report. */
export interface IndexFlowPoint {
  periodEnd: string; // YYYY-MM-DD — a trade date when granularity is "daily", a week-ending Friday when "weekly"
  netValue: number;
}

/**
 * One week's gross foreign buying and selling, from the Market Watch PDF.
 *
 * This is the *only* place in the entire dataset where the two sides are
 * separated: the Daily Quotation Report that feeds the daily net series above
 * reports one signed net figure per stock and nothing else, which is why
 * daily_index_foreign_flow is net-only. Net alone hides turnover: a flat week
 * of ₱0 net looks identical whether foreigners traded ₱40B in both directions
 * or barely traded at all.
 *
 * fetch-foreign-flow.ts has been writing these two columns every day since the
 * table existed and, until now, nothing on the site read either of them.
 */
export interface GrossFlowPoint {
  periodEnd: string; // YYYY-MM-DD, a week-ending Friday
  buyValue: number;
  sellValue: number;
  netValue: number;
}

export interface ForeignFlowPageData {
  indexFlow: IndexFlowPoint[];
  /** Whether indexFlow is real per-trading-day data or the older weekly/mock fallback — lets the page caption the chart honestly instead of always saying "daily". */
  indexFlowGranularity: "daily" | "weekly" | "mock";
  /** Weekly gross buy/sell. Empty when the weekly table has no rows; never mocked — a gross split is either real or absent. */
  grossFlow: GrossFlowPoint[];
  periodEnd: string;
  topBuying: StockForeignFlow[];
  topSelling: StockForeignFlow[];
  stockFlowSource: "real" | "mock";
}

/**
 * Index-level history prefers real *daily* data (daily_index_foreign_flow,
 * populated by fetch-block-sales.ts from the Daily Quotation Report's full
 * per-stock table — see that job's doc comment) over the older *weekly*
 * data (index_foreign_flow, from PSE's Market Watch PDF, fetch-foreign-flow.ts)
 * over MockForeignFlowSource, each tier falling back to the next on an empty
 * result or DB error — same contract as getDailyQuotes. The weekly tier is
 * kept as a fallback rather than removed: it's still real data, and it's a
 * useful safety net given fetch-foreign-flow's history of silently stalling
 * (see CLAUDE.md's foreign-flow AJAX fix entry) — if the daily table is ever
 * empty (e.g. before fetch-block-sales.ts has run even once, or an outage),
 * a stale-but-real weekly chart beats an empty one.
 *
 * Per-stock top-buying/top-selling is unchanged from before — see git
 * history/CLAUDE.md, this file's own comment block just used to also cover
 * it before the daily/weekly split above was introduced.
 */
export async function getForeignFlowPageData(): Promise<ForeignFlowPageData> {
  const databaseUrl = process.env.DATABASE_URL;

  let indexFlow: IndexFlowPoint[] | null = null;
  let indexFlowGranularity: "daily" | "weekly" | "mock" = "mock";
  let grossFlow: GrossFlowPoint[] = [];
  let stockFlow: { periodEnd: string; topBuying: StockForeignFlow[]; topSelling: StockForeignFlow[] } | null = null;

  if (databaseUrl) {
    try {
      const db = createDb(databaseUrl);
      const [dailyRows, weeklyRows, stockResult] = await Promise.all([
        getDailyIndexForeignFlowHistory(db, 30),
        getIndexForeignFlowHistory(db, 12),
        getLatestStockForeignFlow(db),
      ]);

      if (dailyRows.length > 0) {
        indexFlow = dailyRows.map((r) => ({ periodEnd: r.periodEnd, netValue: r.netValue }));
        indexFlowGranularity = "daily";
      } else if (weeklyRows.length > 0) {
        indexFlow = weeklyRows.map((r) => ({ periodEnd: r.periodEnd, netValue: r.netValue }));
        indexFlowGranularity = "weekly";
      }

      // Independent of the tier chosen above: the gross split is weekly no
      // matter what the net chart is showing, so it is its own panel rather
      // than extra columns on a table that may be rendering daily rows.
      grossFlow = weeklyRows.map((r) => ({
        periodEnd: r.periodEnd,
        buyValue: r.foreignBuyValue,
        sellValue: r.foreignSellValue,
        netValue: r.netValue,
      }));

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
  if (!indexFlow) {
    indexFlow = (await mock.getIndexFlow()).map((r) => ({ periodEnd: r.periodEnd, netValue: r.netValue }));
    indexFlowGranularity = "mock";
  }
  if (!stockFlow) stockFlow = await mock.getTopStockFlows();

  return { indexFlow, indexFlowGranularity, grossFlow, ...stockFlow, stockFlowSource };
}
