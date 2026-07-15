export interface NewsItem {
  source: string;
  title: string;
  snippet: string | null;
  url: string;
  publishedAt: Date;
  tickers: string[];
}

export interface NewsSource {
  name: string;
  fetchLatest(): Promise<NewsItem[]>;
}
