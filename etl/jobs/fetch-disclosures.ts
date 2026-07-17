import "../lib/loadEnv";
import { createDb, disclosures } from "@pseye/db";
import { PseEdgeDisclosureSource } from "@pseye/source-disclosures";

/**
 * Runs hourly (see .github/workflows/disclosures-hourly.yml), matching the
 * cadence of the news ETL job.
 */
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const db = createDb(databaseUrl);
  const source = new PseEdgeDisclosureSource();
  const items = await source.getRecent();

  if (items.length === 0) {
    console.log("No disclosures found for this run (or the fetch failed) — nothing to insert.");
    return;
  }

  await db
    .insert(disclosures)
    .values(
      items.map((d) => ({
        ticker: d.ticker,
        companyName: d.companyName,
        type: d.type,
        headline: d.headline,
        filedAt: new Date(d.filedAt),
        referenceNo: d.referenceNo,
      }))
    )
    .onConflictDoNothing({ target: disclosures.referenceNo });

  console.log(`Inserted up to ${items.length} disclosures (duplicates skipped).`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
