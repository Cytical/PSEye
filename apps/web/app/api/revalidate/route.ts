import { revalidatePath } from "next/cache";

/**
 * On-demand revalidation, called by etl/jobs/post-daily-tweet.ts right before
 * it screenshots the market map. The homepage (app/page.tsx) is
 * `revalidate = 3600` (1h ISR) — without forcing a fresh render here, the
 * screenshot could capture whatever the cache last happened to regenerate,
 * not necessarily today's finalized close, which would undermine the whole
 * point of an end-of-day post. Gated by a shared secret (not auth) since this
 * only ever triggers a cache refresh, never exposes or mutates data.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  if (!process.env.REVALIDATE_SECRET || secret !== process.env.REVALIDATE_SECRET) {
    return Response.json({ error: "Invalid secret" }, { status: 401 });
  }

  revalidatePath("/");

  const date = searchParams.get("date");
  if (date) revalidatePath(`/daily/${date}`);

  return Response.json({ revalidated: true, paths: date ? ["/", `/daily/${date}`] : ["/"] });
}
