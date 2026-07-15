export const PSE_SECTORS = [
  "Financials",
  "Industrial",
  "Holding Firms",
  "Property",
  "Services",
  "Mining & Oil",
] as const;

export type PseSector = (typeof PSE_SECTORS)[number];

export interface Quote {
  ticker: string;
  companyName: string;
  sector: PseSector;
  price: number;
  pctChange: number;
  marketCap: number;
}

export interface QuoteSource {
  getDailyQuotes(): Promise<Quote[]>;
}

export interface HistoricalClose {
  date: string; // YYYY-MM-DD
  close: number;
}

export interface HistoricalQuoteSource {
  /** Business-day closes from `fromDate` through today, inclusive, ascending by date. */
  getHistory(ticker: string, fromDate: string): Promise<HistoricalClose[]>;
}
