import { createDb, indexForeignFlow, stockForeignFlow } from "@pseye/db";
import { MockForeignFlowSource } from "@pseye/source-foreign-flow";

/**
 * Runs weekly (see .github/workflows/foreign-flow-weekly.yml), matching the
 * cadence of PSE's Market Watch PDF. Swap MockForeignFlowSource for a real
 * PDF-table-extraction pipeline once that exists — nothing else here changes.
 * Weekly/monthly granularity only; true daily foreign flow needs a licensed
 * feed (see project plan).
 */
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const db = createDb(databaseUrl);
  const source = new MockForeignFlowSource();

  const indexFlow = await source.getIndexFlow();
  await db
    .insert(indexForeignFlow)
    .values(indexFlow)
    .onConflictDoNothing({ target: indexForeignFlow.periodEnd });

  const { periodEnd, topBuying, topSelling } = await source.getTopStockFlows();
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
    `Upserted ${indexFlow.length} index-level periods and ${stockRows.length} stock-level rows.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
