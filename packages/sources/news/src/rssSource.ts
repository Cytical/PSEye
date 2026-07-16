import Parser from "rss-parser";
import type { NewsItem, NewsSource } from "./types";
import { tagTickers } from "./tickerTagger";

// Bounds how long a single outlet can block a fetch. Without it, an
// unreachable feed (see the UNVERIFIED outlets in outlets.ts) hangs on the
// default socket timeout instead of failing fast enough to stream around.
const parser = new Parser({ timeout: 8_000 });

function stripHtmlAndTruncate(input: string | undefined, maxLength = 240): string | null {
  if (!input) return null;
  const text = input.replace(/<[^>]*>/g, "").trim();
  if (!text) return null;
  return text.length > maxLength ? `${text.slice(0, maxLength - 1)}…` : text;
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
            publishedAt,
            tickers: tagTickers(`${item.title} ${snippet ?? ""}`),
          },
        ];
      });
    },
  };
}
