import Parser from "rss-parser";
import type { NewsItem, NewsSource } from "./types";
import { tagTickers } from "./tickerTagger";

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
const parser = new Parser<Record<string, unknown>, RssImageFields>({
  timeout: 8_000,
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
  if (item.enclosure?.url) return item.enclosure.url;

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
 * Builds a NewsSource from any standard RSS/Atom feed. Adding or removing an
 * outlet is a config change (see outlets.ts), never a change to callers.
 */
export function createRssSource(name: string, feedUrl: string): NewsSource {
  return {
    name,
    async fetchLatest(): Promise<NewsItem[]> {
      const feed = await parser.parseURL(feedUrl);

      return (feed.items ?? []).flatMap((item) => {
        if (!item.link || !item.title) return [];

        const snippet = stripHtmlAndTruncate(item.contentSnippet ?? item.content);
        const publishedAt = item.isoDate ? new Date(item.isoDate) : new Date();

        return [
          {
            source: name,
            title: item.title,
            snippet,
            imageUrl: extractImageUrl(item),
            url: item.link,
            publishedAt,
            tickers: tagTickers(`${item.title} ${snippet ?? ""}`),
          },
        ];
      });
    },
  };
}
