import "../lib/loadEnv";
import { createDb, corporateActions } from "@pseye/db";
import { PseEdgeCorporateActionSource } from "@pseye/source-corporate-actions";

/**
 * Runs daily (see .github/workflows/fetch-daily.yml).
 *
 * CORP_ACTIONS_LOOKBACK_DAYS / CORP_ACTIONS_MAX_PAGES override the source's
 * defaults for one-off backfill runs — e.g. `CORP_ACTIONS_LOOKBACK_DAYS=400
 * CORP_ACTIONS_MAX_PAGES=40` pulls a full trailing year of dividend history
 * for the /dividends screener. The scheduled daily run stays at the shallow
 * defaults: dividends are declared weeks ahead of their ex-date, so once
 * backfilled, history accumulates on its own.
 */
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const maxPages = Number(process.env.CORP_ACTIONS_MAX_PAGES) || 15;
  const lookbackDays = Number(process.env.CORP_ACTIONS_LOOKBACK_DAYS) || 14;

  const db = createDb(databaseUrl);
  const source = new PseEdgeCorporateActionSource(300, maxPages, lookbackDays);
  const actions = await source.getUpcoming();

  if (actions.length === 0) {
    console.log("No corporate actions found for this run (or the fetch failed) — nothing to insert.");
    return;
  }

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
