import { revalidatePath, revalidateTag } from "next/cache";

/**
 * On-demand revalidation, called by etl/jobs/post-daily-tweet.ts right before
 * it screenshots the market map. The homepage (app/page.tsx) is
 * `revalidate = 3600` (1h ISR) — without forcing a fresh render here, the
 * screenshot could capture whatever the cache last happened to regenerate,
 * not necessarily today's finalized close, which would undermine the whole
 * point of an end-of-day post. Gated by a shared secret (not auth) since this
 * only ever triggers a cache refresh, never exposes or mutates data.
 *
 * revalidateTag matters as much as revalidatePath here: getDailyQuotes/
 * getCompanyProfiles (lib/quotes.ts, lib/companyProfiles.ts) are wrapped in
 * unstable_cache with their own 3600s window, shared across every page that
 * calls them — revalidatePath("/") alone re-renders the homepage's shell but
 * can still read that same not-yet-expired cached data, defeating the point.
 * Passed `{ expire: 0 }` (immediate expiry), not `"max"` — `"max"` is
 * stale-while-revalidate, meaning the *next* visit (this same screenshot
 * request) still gets served the stale entry while a fresh one loads in the
 * background, which is exactly the staleness this route exists to prevent.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return Response.json({ error: "Invalid secret" }, { status: 401 });
  }

  revalidateTag("daily-quotes", { expire: 0 });
  revalidateTag("company-profiles", { expire: 0 });
  revalidatePath("/");

  const date = searchParams.get("date");
  if (date) revalidatePath(`/daily/${date}`);

  return Response.json({ revalidated: true, paths: date ? ["/", `/daily/${date}`] : ["/"] });
}
