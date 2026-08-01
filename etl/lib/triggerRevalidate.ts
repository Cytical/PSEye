/**
 * Best-effort on-demand ISR revalidation, called by ETL jobs right after
 * they write new data. Replaces relying purely on each page's wall-clock
 * `revalidate` window: before 2026-08-01, app/layout.tsx's own `revalidate`
 * capped every route site-wide at 1h (this Next version uses the LOWEST
 * `revalidate` across a route's whole layout+page tree — see that file's
 * comment), so a stale page visited between real data updates still forced a
 * full regeneration even though nothing had changed. That was a real
 * contributor to Vercel's ISR Writes quota. See app/api/revalidate/route.ts
 * (the endpoint this calls) for the tag/path allowlist and secret gate.
 *
 * Never throws — a failure here should never fail the ETL job itself; each
 * page's (now much longer) wall-clock ceiling is still there as a fallback
 * if this call doesn't land.
 */
export async function triggerRevalidate(tags: string[], paths: string[]): Promise<void> {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) {
    console.warn("triggerRevalidate: REVALIDATE_SECRET not set — skipping on-demand revalidation.");
    return;
  }
  // "||" not "??": an unset SITE_URL secret in GitHub Actions comes through
  // as an empty string, not undefined/null, so "??" wouldn't fall back here.
  const siteUrl = (process.env.SITE_URL || "https://pseye.site").replace(/\/$/, "");
  try {
    const url =
      `${siteUrl}/api/revalidate?secret=${encodeURIComponent(secret)}` +
      `&tags=${encodeURIComponent(tags.join(","))}` +
      `&paths=${encodeURIComponent(paths.join(","))}`;
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`triggerRevalidate: revalidate call returned HTTP ${res.status}`);
    }
  } catch (err) {
    console.warn("triggerRevalidate: revalidate call failed", err);
  }
}
