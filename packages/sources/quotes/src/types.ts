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
