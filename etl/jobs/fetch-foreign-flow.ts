import "../lib/loadEnv";
import { sql } from "drizzle-orm";
import { createDb, indexForeignFlow } from "@pseye/db";
import { PseMarketWatchForeignFlowSource } from "../lib/pseMarketWatch/pseMarketWatchForeignFlowSource";

/**
 * Runs daily as a step in .github/workflows/fetch-daily.yml (folded in
 * 2026-07-26, previously its own foreign-flow-daily.yml) even though the
 * underlying Market Watch PDF is only published weekly — PSE's own disclaimer
 * notes a week's figures can be amended up to t+2 days after it closes, so
 * polling daily catches revisions sooner than waiting for the next Monday.
 * Most days this just re-upserts the same periodEnd row. Index-level flow only —
 * PseMarketWatchForeignFlowSource, PDF-table extraction (see that package's
 * pseMarketWatch/ doc comments). Upserts via onConflictDoUpdate (not
 * DoNothing) since the PDF's own disclaimer notes foreign-transaction
 * figures can be amended up to t+2 days after a week closes.
 *
 * Per-stock foreign flow (stock_foreign_flow) is populated separately, daily,
 * by fetch-block-sales.ts — a real "Net Foreign Buying/(Selling)" per-stock
 * figure turned out to already be in the Daily Quotation Report that job
 * fetches for block sales (see parseQuotationReportForeignFlow's doc
 * comment), replacing the old MockForeignFlowSource-backed weekly write that
 * used to happen here.
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
    return;
  }

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

  console.log(`Upserted index-level foreign flow for period ${indexFlow.periodEnd}.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
