import { revalidatePath, revalidateTag } from "next/cache";

/**
 * On-demand revalidation. Originally built solely for
 * etl/jobs/post-daily-tweet.ts (called right before it screenshots the
 * market map — the homepage's ISR cache otherwise might not reflect today's
 * finalized close yet). Generalized 2026-08-01 so every ETL job can call this
 * right after it writes new data, instead of every page relying purely on its
 * own wall-clock `revalidate` window: with every page site-wide previously
 * capped at hourly by the root layout (see app/layout.tsx's comment) even
 * though most sources only update once a day, a stale page getting visited
 * outside a real update window still forced a full regeneration — a real
 * contributor to Vercel's ISR Writes quota. Explicit `tags`/`paths` params
 * let each job target only what it actually just changed; omitting both
 * falls back to the original quotes-only behavior for backward compatibility
 * with the existing post-daily-tweet.ts call.
 *
 * Gated by a shared secret (not auth) since this only ever triggers a cache
 * refresh, never exposes or mutates data. `{ expire: 0 }` (immediate expiry),
 * not `"max"` — `"max"` is stale-while-revalidate, meaning the request right
 * after this one would still get served the stale entry.
 *
 * `tags` is checked against KNOWN_TAGS (every `unstable_cache` tag currently
 * defined under apps/web/lib/) rather than passed straight to revalidateTag —
 * this endpoint is reachable by anyone who knows REVALIDATE_SECRET, which
 * every ETL job's GitHub Actions environment has, so a closed allowlist keeps
 * a typo from silently no-oping instead of surfacing as a caught error.
 */
const KNOWN_TAGS = new Set([
  "daily-quotes",
  "company-profiles",
  "company-financials",
  "market-snapshot",
  "news",
  "disclosures",
  "corporate-actions",
  "historical-quotes",
  "daily-recap",
]);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return Response.json({ error: "Invalid secret" }, { status: 401 });
  }

  const tagsParam = searchParams.get("tags");
  const pathsParam = searchParams.get("paths");
  const date = searchParams.get("date");

  const tags = tagsParam
    ? tagsParam.split(",").filter((t) => KNOWN_TAGS.has(t))
    : ["daily-quotes", "company-profiles"];
  const paths = pathsParam ? pathsParam.split(",").filter((p) => p.startsWith("/")) : ["/"];

  for (const tag of tags) revalidateTag(tag, { expire: 0 });
  for (const path of paths) revalidatePath(path);
  if (date) revalidatePath(`/daily/${date}`);

  return Response.json({ revalidated: true, tags, paths: date ? [...paths, `/daily/${date}`] : paths });
}
