import "../lib/loadEnv";
import { createDb } from "@pseye/db";
import { migrate } from "drizzle-orm/neon-http/migrator";

/**
 * Applies packages/db/drizzle/*.sql non-interactively. Not `drizzle-kit push`:
 * push's interactive prompt (for resolving renames/ambiguous diffs) needs a
 * real TTY, which CI runners don't have, so it hangs indefinitely there.
 * migrate() just applies the already-generated, already-reviewed SQL files
 * and is idempotent (tracks applied migrations in `__drizzle_migrations`).
 */
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const db = createDb(databaseUrl);
  await migrate(db, { migrationsFolder: "../packages/db/drizzle" });
  console.log("Migrations applied.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
