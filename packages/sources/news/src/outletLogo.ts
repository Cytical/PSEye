import * as cheerio from "cheerio";

function resolveUrl(url: string, base: string): string {
  try {
    return new URL(url, base).toString();
  } catch {
    return url;
  }
}

/** A JSON-LD node's "logo" can be a bare URL string or an ImageObject with its own "url" field. */
function logoFromJsonLdNode(node: unknown): string | null {
  if (!node || typeof node !== "object") return null;
  const obj = node as Record<string, unknown>;

  const type = obj["@type"];
  const isOrg =
    type === "Organization" ||
    type === "NewsMediaOrganization" ||
    (Array.isArray(type) && (type.includes("Organization") || type.includes("NewsMediaOrganization")));

  if (isOrg && obj.logo) {
    if (typeof obj.logo === "string") return obj.logo;
    if (typeof obj.logo === "object" && obj.logo !== null) {
      const logoUrl = (obj.logo as Record<string, unknown>).url;
      if (typeof logoUrl === "string") return logoUrl;
    }
  }

  // Some pages only carry the org logo nested under a NewsArticle's
  // "publisher" field rather than as a standalone Organization block.
  if (obj.publisher) return logoFromJsonLdNode(obj.publisher);

  return null;
}

/**
 * Extracts an outlet's own logo from its homepage HTML, tried in priority
 * order: (a) a JSON-LD Organization/NewsMediaOrganization block's `logo`
 * (most outlets that bother with structured data use this, and it's usually
 * the outlet's actual intended brand mark, not just a favicon), (b)
 * `<link rel="apple-touch-icon">` (typically 120-180px square, a real mark
 * rather than a 16x16 favicon), (c) the homepage's own `og:image` as a last
 * resort (often a generic banner rather than a logo, but still real outlet
 * branding). Pure/no network — see fetchOutletLogo for the wrapper that
 * actually fetches `pageUrl`.
 */
export function extractOutletLogo(html: string, pageUrl: string): string | null {
  const $ = cheerio.load(html);

  const ldJsonScripts = $('script[type="application/ld+json"]');
  for (const el of ldJsonScripts.toArray()) {
    let parsed: unknown;
    try {
      parsed = JSON.parse($(el).text());
    } catch {
      continue; // malformed JSON-LD on this page — try the next block, or fall through
    }
    const candidates = Array.isArray(parsed) ? parsed : [parsed];
    for (const candidate of candidates) {
      const logo = logoFromJsonLdNode(candidate);
      if (logo) return resolveUrl(logo, pageUrl);
    }
  }

  const appleTouchIcon = $('link[rel="apple-touch-icon"]').attr("href");
  if (appleTouchIcon) return resolveUrl(appleTouchIcon, pageUrl);

  const ogImage = $('meta[property="og:image"]').attr("content");
  if (ogImage) return resolveUrl(ogImage, pageUrl);

  return null;
}

const DEFAULT_TIMEOUT_MS = 8_000;

const USER_AGENT =
  "Mozilla/5.0 (compatible; PSEyeBot/1.0; +https://github.com/pseye) fetching a public outlet homepage for its logo, cached once per outlet";

/**
 * Fetches an outlet's homepage and extracts its logo (see extractOutletLogo)
 * — the third and last real-image step in fetch-news.ts's per-article
 * fallback chain (RSS -> per-article og:image -> this), tried only when both
 * of those came up empty for a given article. Callers should look this up
 * at most once per outlet per run and cache the result (see
 * getNewsOutletLogos/upsertNewsOutletLogo in @pseye/db) rather than calling
 * this once per article — a news outlet's logo doesn't change article to
 * article, or really ever.
 *
 * Never throws: returns null on any failure (no homepageUrl, timeout,
 * non-2xx, no logo found by any of the three methods) so the caller falls
 * through to NewsThumbnail's initials placeholder, same tolerance as
 * fetchOgImage.
 */
export async function fetchOutletLogo(
  homepageUrl: string | undefined,
  timeoutMs = DEFAULT_TIMEOUT_MS
): Promise<string | null> {
  if (!homepageUrl) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(homepageUrl, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    return extractOutletLogo(await res.text(), homepageUrl);
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
