import "../lib/loadEnv";
import { sql } from "drizzle-orm";
import { createDb, indexForeignFlow, stockForeignFlow } from "@pseye/db";
import { MockForeignFlowSource } from "@pseye/source-foreign-flow";
import { PseMarketWatchForeignFlowSource } from "../lib/pseMarketWatch/pseMarketWatchForeignFlowSource";

/**
 * Runs weekly (see .github/workflows/foreign-flow-weekly.yml), matching the
 * cadence of PSE's Market Watch PDF.
 *
 * Index-level flow is real (PseMarketWatchForeignFlowSource, PDF-table
 * extraction — see that package's pseMarketWatch/ doc comments). Per-stock
 * top-buying/top-selling rankings are still MockForeignFlowSource: PSE's
 * free market-report page only links a "Preview" of the Monthly Report
 * (cover + written review), not the full report that actually has those
 * per-stock tables — see docs/PLANNING.md and the foreign-flow feasibility
 * notes for what was checked. Upserts via onConflictDoUpdate (not
 * DoNothing) since the PDF's own disclaimer notes foreign-transaction
 * figures can be amended up to t+2 days after a week closes.
 */
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const db = createDb(databaseUrl);

  const indexFlow = await new PseMarketWatchForeignFlowSource().getLatestIndexFlow();
  if (!indexFlow) {
    console.error("fetch-foreign-flow: could not extract index-level flow from the latest Market Watch PDF");
  } else {
    await db
      .insert(indexForeignFlow)
      .values({
        periodEnd: indexFlow.periodEnd,
        foreignBuyValue: Math.round(indexFlow.foreignBuyValue),
        foreignSellValue: Math.round(indexFlow.foreignSellValue),
        netValue: Math.round(indexFlow.netValue),
      })
      .onConflictDoUpdate({
        target: indexForeignFlow.periodEnd,
        set: {
          foreignBuyValue: sql`excluded.foreign_buy_value`,
          foreignSellValue: sql`excluded.foreign_sell_value`,
          netValue: sql`excluded.net_value`,
        },
      });
  }

  const { periodEnd, topBuying, topSelling } = await new MockForeignFlowSource().getTopStockFlows();
  const stockRows = [...topBuying, ...topSelling].map((s) => ({
    periodEnd,
    ticker: s.ticker,
    companyName: s.companyName,
    netValue: s.netValue,
    rank: s.rank,
  }));

  await db
    .insert(stockForeignFlow)
    .values(stockRows)
    .onConflictDoNothing({ target: [stockForeignFlow.periodEnd, stockForeignFlow.ticker] });

  console.log(
    `Upserted index-level period ${indexFlow?.periodEnd ?? "(none)"} and ${stockRows.length} stock-level rows.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
