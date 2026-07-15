import { createDb, offerings } from "@pseye/db";
import { MockOfferingSource } from "@pseye/source-offerings";

/**
 * Runs daily (see .github/workflows/offerings-daily.yml). Swap
 * MockOfferingSource for a real IPO/follow-on disclosure tracker once that
 * pipeline exists — nothing else here changes.
 */
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const db = createDb(databaseUrl);
  const source = new MockOfferingSource();
  const items = await source.getUpcoming();

  await db
    .insert(offerings)
    .values(
      items.map((o) => ({
        ticker: o.ticker,
        companyName: o.companyName,
        sector: o.sector,
        type: o.type,
        offerPrice: o.offerPrice.toString(),
        subscriptionStart: o.subscriptionStart,
        subscriptionEnd: o.subscriptionEnd,
        listingDate: o.listingDate,
        summary: o.summary,
      }))
    )
    .onConflictDoNothing({
      target: [offerings.companyName, offerings.type, offerings.subscriptionStart],
    });

  console.log(`Upserted up to ${items.length} offerings.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
