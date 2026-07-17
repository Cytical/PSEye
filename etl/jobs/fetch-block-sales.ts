import "../lib/loadEnv";
import { createDb, blockSales } from "@pseye/db";
import { PSE_EDGE_COMPANIES } from "@pseye/source-quotes";
import { PseQuotationReportBlockSaleSource } from "../lib/pseQuotationReport/pseQuotationReportBlockSaleSource";

/**
 * Runs daily (see .github/workflows/fetch-block-sales-daily.yml), matching
 * PSE's own daily EOD "Daily Quotation Report" cadence — see
 * PseQuotationReportBlockSaleSource's doc comment for why this replaced the
 * old monthly cadence built around the Monthly Report (which turned out to
 * only publish a cover-page preview, never real block-sale tables).
 *
 * Ticker -> company name comes from the same PSE_EDGE_COMPANIES roster every
 * other real *Source keys off (see CLAUDE.md); a symbol the report lists
 * that isn't in that roster (e.g. a preferred share class, warrant, or SME
 * board issue we don't otherwise track) falls back to the ticker itself
 * rather than skipping the row — still a real trade worth showing.
 */
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const db = createDb(databaseUrl);
  const source = new PseQuotationReportBlockSaleSource();
  const report = await source.getLatest();

  if (!report) {
    console.log("Could not fetch or parse today's Daily Quotation Report.");
    return;
  }

  if (report.rows.length === 0) {
    console.log(`No block sales reported for ${report.tradeDate}.`);
    return;
  }

  const companyNameByTicker = new Map(PSE_EDGE_COMPANIES.map((c) => [c.ticker, c.companyName]));

  await db
    .insert(blockSales)
    .values(
      report.rows.map((r) => ({
        ticker: r.ticker,
        companyName: companyNameByTicker.get(r.ticker) ?? r.ticker,
        tradeDate: report.tradeDate,
        volume: r.volume,
        price: r.price.toString(),
        value: r.value,
      }))
    )
    .onConflictDoNothing({
      target: [blockSales.ticker, blockSales.tradeDate, blockSales.volume, blockSales.price],
    });

  console.log(`Upserted up to ${report.rows.length} block sale trades for ${report.tradeDate}.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
