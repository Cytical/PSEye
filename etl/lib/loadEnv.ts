import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Side-effect import: loads etl/.env into process.env for local runs, via
 * Node's native loadEnvFile (no dotenv dependency needed, Node >=20.12).
 * Silently no-ops if the file doesn't exist — GitHub Actions injects
 * DATABASE_URL as a real env var (see .github/workflows/*.yml), which is why
 * this file is gitignored and absent in CI.
 *
 * DATABASE_URL is deliberately forced to the file's value when the file
 * defines it, inverting Node's own precedence (an already-set process env var
 * normally wins and loadEnvFile leaves it alone — verified, not assumed).
 * Rationale: a stale DATABASE_URL inherited from the launching shell points at
 * a real, reachable, *empty* Neon project, so every job "succeeds" while
 * writing to the wrong database and every page silently renders mock data.
 * That has now happened twice on this machine. Nothing else in .env has that
 * failure mode — a wrong secret or API key fails loudly — so the override is
 * scoped to this one key rather than applied wholesale.
 */
const envPath = join(dirname(fileURLToPath(import.meta.url)), "..", ".env");

if (existsSync(envPath)) {
  const inherited = process.env.DATABASE_URL;

  // loadEnvFile skips keys already present in process.env, so clear this one
  // first and let Node do the parsing rather than hand-rolling a dotenv reader.
  delete process.env.DATABASE_URL;
  process.loadEnvFile(envPath);

  if (process.env.DATABASE_URL === undefined) {
    // The file doesn't define it after all — restore whatever we were given.
    if (inherited !== undefined) process.env.DATABASE_URL = inherited;
  } else if (inherited !== undefined && inherited !== process.env.DATABASE_URL) {
    // ASCII only: this warning is read in a Windows console that renders the
    // repo's usual em dash as mojibake.
    console.warn(
      `[loadEnv] Ignoring inherited DATABASE_URL (${describeDbHost(inherited)}) ` +
        `- using etl/.env instead (${describeDbHost(process.env.DATABASE_URL)}).`,
    );
  }
}

/** Host only, so a connection string never reaches a log or CI transcript. */
function describeDbHost(url: string): string {
  try {
    return new URL(url).host;
  } catch {
    return "unparseable URL";
  }
}
