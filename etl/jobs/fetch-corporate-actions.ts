import { createDb, corporateActions } from "@pseye/db";
import { PseEdgeCorporateActionSource } from "@pseye/source-corporate-actions";

/**
 * Runs daily (see .github/workflows/corporate-actions-daily.yml).
 */
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const db = createDb(databaseUrl);
  const source = new PseEdgeCorporateActionSource();
  const actions = await source.getUpcoming();

  await db
    .insert(corporateActions)
    .values(actions)
    .onConflictDoNothing({
      target: [corporateActions.ticker, corporateActions.type, corporateActions.exDate],
    });

  console.log(`Upserted up to ${actions.length} corporate actions.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
