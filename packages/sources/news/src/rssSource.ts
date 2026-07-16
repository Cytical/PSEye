import Parser from "rss-parser";
import type { NewsItem, NewsSource } from "./types";
import { tagTickers } from "./tickerTagger";

interface MediaFields {
  mediaThumbnail?: { $?: { url?: string } };
  mediaContent?: Array<{ $?: { url?: string; medium?: string } }>;
}

type FeedItem = Parser.Item & MediaFields;

const parser: Parser<Record<string, unknown>, FeedItem> = new Parser({
  customFields: {
    item: [
      ["media:thumbnail", "mediaThumbnail"],
      ["media:content", "mediaContent", { keepArray: true }],
    ],
  },
});

function stripHtmlAndTruncate(input: string | undefined, maxLength = 240): string | null {
  if (!input) return null;
  const text = input.replace(/<[^>]*>/g, "").trim();
  if (!text) return null;
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
}

/**
 * Feeds surface a thumbnail in different ways: a plain <enclosure>, the Media
 * RSS namespace (media:thumbnail / media:content), or just an <img> buried in
 * the full-content HTML (common on WordPress-based outlet feeds). Try each in
 * order of reliability.
 */
function extractImageUrl(item: FeedItem): string | null {
  if (item.enclosure?.url && (!item.enclosure.type || item.enclosure.type.startsWith("image/"))) {
    return item.enclosure.url;
  }

  const thumbnailUrl = item.mediaThumbnail?.$?.url;
  if (thumbnailUrl) return thumbnailUrl;

  const contentUrl = item.mediaContent?.find((entry) => entry.$?.url)?.$?.url;
  if (contentUrl) return contentUrl;

  const html = item.content ?? item.contentSnippet;
  const match = typeof html === "string" ? html.match(/<img[^>]+src=["']([^"']+)["']/i) : null;
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
            url: item.link,
            imageUrl: extractImageUrl(item),
            publishedAt,
            tickers: tagTickers(`${item.title} ${snippet ?? ""}`),
          },
        ];
      });
    },
  };
}
