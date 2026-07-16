export interface NewsItem {
  source: string;
  title: string;
  snippet: string | null;
  url: string;
  imageUrl: string | null;
  publishedAt: Date;
  tickers: string[];
}

export interface NewsSource {
  name: string;
  fetchLatest(): Promise<NewsItem[]>;
}
