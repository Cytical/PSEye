import "../lib/loadEnv";
import { sql } from "drizzle-orm";
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

  // onConflictDoUpdate (not onConflictDoNothing) so a row already on record
  // gets its columns refreshed — in particular `url`, added after this job
  // had already been inserting rows for a while; onConflictDoNothing would
  // leave every pre-existing row's url permanently null since the source is
  // a fixed deterministic mock list that re-generates the same identities
  // every run.
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
        url: o.url,
      }))
    )
    .onConflictDoUpdate({
      target: [offerings.companyName, offerings.type, offerings.subscriptionStart],
      set: {
        ticker: sql`excluded.ticker`,
        sector: sql`excluded.sector`,
        offerPrice: sql`excluded.offer_price`,
        subscriptionEnd: sql`excluded.subscription_end`,
        listingDate: sql`excluded.listing_date`,
        summary: sql`excluded.summary`,
        url: sql`excluded.url`,
      },
    });

  console.log(`Upserted up to ${items.length} offerings.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
