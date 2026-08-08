import type { NewsSentiment } from "./sentiment";
import type { FALLBACK_TOPIC, NewsTopic } from "./topics";

export interface NewsItem {
  source: string;
  title: string;
  snippet: string | null;
  imageUrl: string | null;
  url: string;
  publishedAt: Date;
  tickers: string[];
  /**
   * The article's byline, from the feed's own dc:creator (see
   * extractAuthor in rssSource.ts). Null where the outlet doesn't publish
   * one: of the eight configured feeds, Manila Times, Rappler, Malaya and
   * Inquirer carry it; Philstar, GMA and Manila Bulletin send no author
   * field at all. Often a wire service ("Reuters", "Associated Press")
   * rather than a person, which is itself worth showing.
   */
  author: string | null;
  /**
   * Which desk this story files under (see classifyTopic in topics.ts),
   * derived from title+snippet at fetch time the same way tickers and
   * sentiment are. Null only for rows written before the column existed and
   * not yet re-fetched. Always a NewsTopic or FALLBACK_TOPIC otherwise,
   * never an arbitrary string.
   */
  topic: NewsTopic | typeof FALLBACK_TOPIC | null;
  /**
   * Words in the article body, when the feed ships one (content:encoded).
   * Backs the "4 min read" estimate. Null where the feed carries only a
   * lede, which is most of them, and the UI then simply omits the estimate
   * rather than guessing from the snippet: a reading time computed off 240
   * characters would say "1 min read" for every article on the page.
   */
  wordCount: number | null;
  /**
   * Lexicon-based headline+snippet sentiment (see sentiment.ts), computed
   * once at RSS-fetch time (createRssSource, mirroring how tagTickers is
   * computed there too) and persisted to news_items.sentiment rather than
   * recomputed on every page render. Null only for rows written before this
   * column existed and not yet re-fetched — treat the same as "neutral" in
   * aggregates (see computeMoodSummary in apps/web/lib/news.ts).
   */
  sentiment: NewsSentiment | null;
  /**
   * True when imageUrl is that outlet's cached logo (fetch-news.ts's third
   * and last real-image fallback, after RSS and per-article og:image both
   * came up empty — see news_outlet_logos in @pseye/db), not an RSS or
   * og:image photo. UI-only hint, not stored on news_items itself (derived
   * in apps/web/lib/news.ts by comparing imageUrl against
   * getNewsOutletLogos) — NewsThumbnail.tsx uses it to render a logo with
   * object-contain instead of the cropping object-cover a real photo wants.
   * Always false/undefined on the live-fetch fallback path, which never
   * applies that fallback chain.
   */
  imageIsLogo?: boolean;
  /**
   * The outlet's own logo, from the news_outlet_logos cache, for the small
   * mark rendered beside the masthead name in a card's byline.
   *
   * Distinct from imageUrl even when the two happen to be equal: that field is
   * the story's picture (with the logo as a last-resort stand-in), this one is
   * always the outlet's brand mark regardless of what illustrates the story.
   * Undefined on the live-fetch fallback path, which has no logo cache to read.
   */
  outletLogoUrl?: string | null;
}

export interface NewsSource {
  name: string;
  /**
   * The outlet's own site root (e.g. "https://www.bworldonline.com"),
   * derived from the feed URL's origin — used only as the page
   * fetchOutletLogo (outletLogo.ts) looks at when an article has no
   * RSS-provided or per-article og:image (see fetch-news.ts's fallback
   * chain). Optional since it's meaningless for a future non-RSS NewsSource.
   */
  homepageUrl?: string;
  fetchLatest(): Promise<NewsItem[]>;
}
