export interface NewsItem {
  source: string;
  title: string;
  snippet: string | null;
  imageUrl: string | null;
  url: string;
  publishedAt: Date;
  tickers: string[];
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
