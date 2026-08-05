import * as cheerio from "cheerio";

/**
 * Extracts the Open Graph / Twitter Card preview image from an article's own
 * page HTML — the same `<meta property="og:image">` (falling back to
 * `<meta name="twitter:image">`) that every social-link-unfurl (Slack, X,
 * Facebook...) already reads, and that virtually every news outlet publishes
 * for exactly that purpose. Pure/no network, matching the parseXxxHtml
 * pattern in @pseye/source-quotes's pseEdge/ dir (easy to unit test with a
 * fixture) — see fetchOgImage below for the network-calling wrapper.
 */
export function extractOgImage(html: string): string | null {
  const $ = cheerio.load(html);
  const ogImage = $('meta[property="og:image"]').attr("content");
  if (ogImage) return ogImage;

  const twitterImage = $('meta[name="twitter:image"]').attr("content");
  return twitterImage ?? null;
}

const DEFAULT_TIMEOUT_MS = 8_000;

// Identifies the bot honestly (same convention as
// etl/jobs/backfill-company-profiles.ts's USER_AGENT) rather than spoofing a
// browser — unlike rssSource.ts's feed fetch (which needed to clear
// Cloudflare's bot check, see outlets.ts's Inquirer Business comment), a
// plain per-article GET for a publicly-published og:image tag doesn't need
// that; if an outlet ever *does* block this UA, fetchOgImage just returns
// null and the existing placeholder-card fallback in NewsThumbnail.tsx
// covers it, same as an outlet with no image field in its feed at all.
const USER_AGENT =
  "Mozilla/5.0 (compatible; PHMarketEyeBot/1.0; +https://github.com/Cytical/PSEye) fetching a public article page for its og:image preview tag";

/**
 * Fetches one article's own page and extracts its og:image (or twitter:image)
 * meta tag — a second-choice image source, tried only when RSS extraction
 * (extractImageUrl in rssSource.ts: enclosure/media:content/inline-<img>)
 * came up empty. Some outlets' feeds carry no image field at all (Philstar
 * Business, confirmed 2026-07 — 58/58 recent rows with imageUrl null).
 *
 * Network-calling — only ever call this from a scheduled ETL job
 * (etl/jobs/fetch-news.ts), never from apps/web's render path, per this
 * repo's DB-backed-reads-only convention (see CLAUDE.md's `packages/sources/*`
 * section). Never throws: returns null on any failure (timeout, non-2xx
 * response, no og:image/twitter:image present) so one bad article page can't
 * fail the whole fetch-news run — same Promise.allSettled-style tolerance
 * used for the RSS feeds themselves.
 */
export async function fetchOgImage(
  articleUrl: string,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(articleUrl, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return extractOgImage(await res.text());
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
