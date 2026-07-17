import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Side-effect import: loads etl/.env into process.env for local runs, via
 * Node's native loadEnvFile (no dotenv dependency needed, Node >=20.12).
 * Silently no-ops if the file doesn't exist — GitHub Actions injects
 * DATABASE_URL as a real env var (see .github/workflows/*.yml), and existing
 * env vars always take precedence over the file per Node's own semantics.
 */
const envPath = join(dirname(fileURLToPath(import.meta.url)), "..", ".env");
if (existsSync(envPath)) {
  process.loadEnvFile(envPath);
}
