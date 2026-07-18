import "../lib/loadEnv";
import { eq } from "drizzle-orm";
import { createDb, blockSales, stockForeignFlow } from "@pseye/db";
import { PSE_EDGE_COMPANIES } from "@pseye/source-quotes";
import { PseQuotationReportBlockSaleSource } from "../lib/pseQuotationReport/pseQuotationReportBlockSaleSource";

const TOP_N = 10;

/**
 * Runs daily (see .github/workflows/fetch-daily.yml), matching PSE's own
 * daily EOD "Daily Quotation Report" cadence — see
 * PseQuotationReportBlockSaleSource's doc comment for why this replaced the
 * old monthly cadence built around the Monthly Report (which turned out to
 * only publish a cover-page preview, never real block-sale tables).
 *
 * Also upserts per-stock foreign flow (stock_foreign_flow) from the same PDF
 * fetch — see parseQuotationReportPdf.ts's doc comment on
 * parseQuotationReportForeignFlow for how a real, free, per-stock daily "Net
 * Foreign Buying/(Selling)" figure turned out to already be sitting in this
 * report. Only the top/bottom TOP_N by net value are stored (matching what
 * getForeignFlowPageData's UI actually shows — top buying/selling lists, not
 * the full ~380-ticker board), with periodEnd set to the report's trade date
 * (this is genuinely daily now, not the weekly cadence the old mock used).
 *
 * Ticker -> company name comes from the same PSE_EDGE_COMPANIES roster every
 * other real *Source keys off (see CLAUDE.md); a symbol the report lists
 * that isn't in that roster (e.g. a preferred share class, warrant, or SME
 * board issue we don't otherwise track) falls back to the ticker itself
 * rather than skipping the row — still a real trade/flow worth showing.
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

  const companyNameByTicker = new Map(PSE_EDGE_COMPANIES.map((c) => [c.ticker, c.companyName]));

  if (report.rows.length === 0) {
    console.log(`No block sales reported for ${report.tradeDate}.`);
  } else {
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

  const traded = report.stockForeignFlow.filter((r) => r.netForeignValue !== 0);
  const topBuying = [...traded].filter((r) => r.netForeignValue > 0).sort((a, b) => b.netForeignValue - a.netForeignValue).slice(0, TOP_N);
  const topSelling = [...traded].filter((r) => r.netForeignValue < 0).sort((a, b) => a.netForeignValue - b.netForeignValue).slice(0, TOP_N);

  if (topBuying.length === 0 && topSelling.length === 0) {
    console.log(`No per-stock foreign flow extracted for ${report.tradeDate}; leaving existing rows for that date untouched.`);
    return;
  }

  // Delete-then-insert, not upsert: this table holds a top-N leaderboard, not
  // a fixed set of tickers. A ticker that upserted here yesterday but fell
  // out of today's top N would never get touched by an onConflictDoUpdate
  // keyed on (periodEnd, ticker) — its stale row just sits there next to
  // today's real rows, since there's no new row with a matching key to
  // trigger an update over it. Confirmed live: this exact bug surfaced when
  // this table still had leftover rows from the old MockForeignFlowSource
  // weekly job (removed from fetch-foreign-flow.ts in this change) that
  // happened to share periodEnd with today's real trade date (both landed
  // on the same Friday) — mock and real rows rendered interleaved on
  // /foreign-flow until this was replaced with a clean delete-then-insert
  // per period. Only runs once we know there's real replacement data (the
  // empty check above), so a parsing failure can't wipe out a good existing
  // day's data.
  await db.delete(stockForeignFlow).where(eq(stockForeignFlow.periodEnd, report.tradeDate));

  await db.insert(stockForeignFlow).values([
    ...topBuying.map((r, i) => ({
      periodEnd: report.tradeDate,
      ticker: r.ticker,
      companyName: companyNameByTicker.get(r.ticker) ?? r.ticker,
      netValue: Math.round(r.netForeignValue),
      rank: i + 1,
    })),
    ...topSelling.map((r, i) => ({
      periodEnd: report.tradeDate,
      ticker: r.ticker,
      companyName: companyNameByTicker.get(r.ticker) ?? r.ticker,
      netValue: Math.round(r.netForeignValue),
      rank: i + 1,
    })),
  ]);

  console.log(
    `Replaced stock foreign flow for ${report.tradeDate}: ${topBuying.length} top-buying, ${topSelling.length} top-selling.`
  );
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
