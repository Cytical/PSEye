import Parser from "rss-parser";
import type { NewsItem, NewsSource } from "./types";
import { tagTickers } from "./tickerTagger";
import { scoreSentiment } from "./sentiment";

// Extra fields not in rss-parser's default Item shape, needed to recover a
// thumbnail image — most PH outlet feeds carry it as media:content (Media
// RSS) or content:encoded (an inline <img> in the full-content HTML) rather
// than the plain <enclosure> the base type already covers.
interface RssImageFields {
  "media:content"?: { $?: { url?: string } } | Array<{ $?: { url?: string } }>;
  "content:encoded"?: string;
}

// Bounds how long a single outlet can block a fetch. Without it, an
// unreachable feed (see the UNVERIFIED outlets in outlets.ts) hangs on the
// default socket timeout instead of failing fast enough to stream around.
//
// `headers` overrides rss-parser's own default request headers
// (`User-Agent: 'rss-parser'`, `Accept: 'application/rss+xml'`) — confirmed
// live that this literal default User-Agent is exactly why
// "Inquirer Business" (Cloudflare-protected) silently returned zero items on
// *every* run despite being in the RELIABLE tier: Cloudflare served its
// "Just a moment..." JS-challenge HTML page instead of the feed XML, which
// rss-parser's XML parser then fails on — a rejection Promise.allSettled
// swallows in fetchFrom (apps/web/lib/news.ts), so it never surfaced as
// anything louder than a console.error in the ETL job. A realistic browser
// User-Agent (and a broader Accept header some feeds' WAFs also key off)
// clears the challenge. This is the actual mechanism behind "sometimes the
// news data doesn't get received" — not occasional flakiness, a 100%,
// silent failure rate for that one outlet.
const parser = new Parser<Record<string, unknown>, RssImageFields>({
  timeout: 8_000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Accept: "application/rss+xml, application/xml, text/xml, */*",
  },
  customFields: {
    item: ["media:content", "content:encoded"],
  },
});

function stripHtmlAndTruncate(input: string | undefined, maxLength = 240): string | null {
  if (!input) return null;
  const text = input.replace(/<[^>]*>/g, "").trim();
  if (!text) return null;
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

function extractImageUrl(item: Parser.Item & RssImageFields): string | null {
  // Guard against non-image enclosures (podcast audio, PDFs, etc.) — an
  // <enclosure type="audio/mpeg"> rendered straight into <img src> is exactly
  // the "image doesn't load" failure mode this whole pass is fixing. No
  // outlet in outlets.ts is known to do this today, but nothing stops a feed
  // from adding one later, and the check is free.
  if (item.enclosure?.url && (!item.enclosure.type || item.enclosure.type.startsWith("image")))
    return item.enclosure.url;

  const media = item["media:content"];
  const mediaUrl = Array.isArray(media) ? media[0]?.$?.url : media?.$?.url;
  if (mediaUrl) return mediaUrl;

  // Last resort: pull the first <img> out of the full-content HTML, since a
  // handful of outlets only embed the thumbnail inline rather than as a
  // distinct feed field.
  const html = item["content:encoded"] ?? item.content ?? "";
  const match = /<img[^>]+src="([^"]+)"/i.exec(html);
  return match?.[1] ?? null;
}

/**
 * The feed URL's own origin (e.g. "https://www.bworldonline.com" from
 * ".../feed/") — used only as a best-effort homepage for
 * fetchOutletLogo (outletLogo.ts) to look at. Undefined rather than thrown
 * on a malformed feedUrl, since a missing homepage just means that outlet's
 * logo lookup is skipped (falls through to the initials placeholder), not
 * that source construction should fail.
 */
function deriveHomepageUrl(feedUrl: string): string | undefined {
  try {
    return new URL(feedUrl).origin;
  } catch {
    return undefined;
  }
}

/**
 * Builds a NewsSource from any standard RSS/Atom feed. Adding or removing an
 * outlet is a config change (see outlets.ts), never a change to callers.
 */
export function createRssSource(name: string, feedUrl: string): NewsSource {
  return {
    name,
    homepageUrl: deriveHomepageUrl(feedUrl),
    async fetchLatest(): Promise<NewsItem[]> {
      const feed = await parser.parseURL(feedUrl);

      return (feed.items ?? []).flatMap((item) => {
        if (!item.link || !item.title) return [];

        const snippet = stripHtmlAndTruncate(item.contentSnippet ?? item.content);
        const publishedAt = item.isoDate ? new Date(item.isoDate) : new Date();
        const combinedText = `${item.title} ${snippet ?? ""}`;

        return [
          {
            source: name,
            title: item.title,
            snippet,
            imageUrl: extractImageUrl(item),
            url: item.link,
            publishedAt,
            tickers: tagTickers(combinedText),
            sentiment: scoreSentiment(combinedText).sentiment,
          },
        ];
      });
    },
  };
}
