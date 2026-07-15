import { createDb, blockSales } from "@pseye/db";
import { MockBlockSaleSource } from "@pseye/source-block-sales";

/**
 * Runs monthly (see .github/workflows/block-sales-monthly.yml), matching the
 * cadence of PSE's Monthly Report. Swap MockBlockSaleSource for a real
 * PDF-table-extraction pipeline once that exists — nothing else here changes.
 */
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const db = createDb(databaseUrl);
  const source = new MockBlockSaleSource();
  const trades = await source.getLatest();

  await db
    .insert(blockSales)
    .values(
      trades.map((t) => ({
        ticker: t.ticker,
        companyName: t.companyName,
        tradeDate: t.tradeDate,
        volume: t.volume,
        price: t.price.toString(),
        value: t.value,
      }))
    )
    .onConflictDoNothing({
      target: [blockSales.ticker, blockSales.tradeDate, blockSales.volume, blockSales.price],
    });

  console.log(`Upserted up to ${trades.length} block sale trades.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
