import type { NextConfig } from "next";
import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Force DATABASE_URL to the value in apps/web/.env.local when that file exists.
 *
 * Next's documented lookup order (node_modules/next/dist/docs/01-app/02-guides/
 * environment-variables.md, "Environment Variable Load Order") puts `process.env`
 * first and `.env.local` third, so a stale DATABASE_URL exported in the shell
 * that launched `next dev`/`next build` silently overrides the repo's. On this
 * machine that stale value is a real, reachable, *empty* Neon project, so no
 * query throws: every lib/*.ts falls through its `rows.length === 0` branch and
 * the whole site prerenders on mock data while looking perfectly healthy.
 *
 * .env.local is gitignored and absent on Vercel (where DATABASE_URL comes from
 * the platform), so this is a local-development-only correction. Scoped to this
 * one key: a wrong secret or API key fails loudly, a wrong database does not.
 * Mirrors etl/lib/loadEnv.ts, which had the same problem for the ETL jobs.
 */
const envPath = path.join(__dirname, ".env.local");

if (existsSync(envPath)) {
  const inherited = process.env.DATABASE_URL;

  // loadEnvFile skips keys already in process.env, so clear this one first and
  // let Node parse the file rather than hand-rolling a dotenv reader.
  delete process.env.DATABASE_URL;
  process.loadEnvFile(envPath);

  if (process.env.DATABASE_URL === undefined) {
    // The file doesn't define it after all — restore whatever we were given.
    if (inherited !== undefined) process.env.DATABASE_URL = inherited;
  } else if (inherited !== undefined && inherited !== process.env.DATABASE_URL) {
    // Host only, so a connection string never lands in a log or CI transcript.
    const host = (url: string) => {
      try {
        return new URL(url).host;
      } catch {
        return "unparseable URL";
      }
    };
    // ASCII only: this warning is read in a Windows console that renders the
    // repo's usual em dash as mojibake.
    console.warn(
      `[next.config] Ignoring inherited DATABASE_URL (${host(inherited)}) - ` +
        `using apps/web/.env.local instead (${host(process.env.DATABASE_URL)}).`,
    );
  }
}

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname, "..", ".."),
  },
};

export default nextConfig;
