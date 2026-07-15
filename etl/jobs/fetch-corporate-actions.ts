import { createDb, corporateActions } from "@pseye/db";
import { MockCorporateActionSource } from "@pseye/source-corporate-actions";

/**
 * Runs daily (see .github/workflows/corporate-actions-daily.yml). Swap
 * MockCorporateActionSource for a real PSE Edge disclosure parser once that
 * pipeline exists — nothing else here changes.
 */
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const db = createDb(databaseUrl);
  const source = new MockCorporateActionSource();
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
