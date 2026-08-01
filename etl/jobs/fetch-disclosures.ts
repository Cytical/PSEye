import "../lib/loadEnv";
import { sql } from "drizzle-orm";
import { createDb, disclosures } from "@pseye/db";
import { PseEdgeDisclosureSource } from "@pseye/source-disclosures";
import { triggerRevalidate } from "../lib/triggerRevalidate";

/**
 * Runs daily as a step in .github/workflows/fetch-daily.yml — the
 * disclosures-hourly.yml this comment used to reference doesn't exist
 * anymore (folded into fetch-daily.yml in the 2026-07 consolidation, same as
 * news — see fetch-news.ts's own doc comment for that history).
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

  // onConflictDoUpdate (not onConflictDoNothing) so a disclosure already on
  // record gets its columns refreshed — in particular `url`, added after
  // this job had already been inserting rows for a while; onConflictDoNothing
  // would leave every pre-existing row's url permanently null since the job
  // only ever sees the same referenceNo again while it's still within PSE
  // Edge's recent-announcements search window.
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
        url: d.url,
      }))
    )
    .onConflictDoUpdate({
      target: disclosures.referenceNo,
      set: {
        ticker: sql`excluded.ticker`,
        companyName: sql`excluded.company_name`,
        type: sql`excluded.type`,
        headline: sql`excluded.headline`,
        filedAt: sql`excluded.filed_at`,
        url: sql`excluded.url`,
      },
    });

  console.log(`Upserted up to ${items.length} disclosures.`);
  await triggerRevalidate(["disclosures"], ["/disclosures"]);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
