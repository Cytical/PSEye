import type { Quote, QuoteSource } from "./types";

/**
 * Placeholder QuoteSource until Open Question #1 (a legally-sound, full-coverage
 * price feed) is resolved. Ticker roster and sectors are real; price/pctChange/
 * marketCap are fabricated sample values so the treemap pipeline is buildable
 * end-to-end. Swap this out via the QuoteSource interface, not by editing callers.
 */
export class MockQuoteSource implements QuoteSource {
  async getDailyQuotes(): Promise<Quote[]> {
    return SAMPLE_QUOTES;
  }
}

const SAMPLE_QUOTES: Quote[] = [
  { ticker: "BDO", companyName: "BDO Unibank", sector: "Financials", price: 145.5, pctChange: 1.2, marketCap: 680_000_000_000 },
  { ticker: "BPI", companyName: "Bank of the Philippine Islands", sector: "Financials", price: 118.3, pctChange: -0.6, marketCap: 430_000_000_000 },
  { ticker: "MBT", companyName: "Metropolitan Bank & Trust", sector: "Financials", price: 68.9, pctChange: 0.4, marketCap: 240_000_000_000 },
  { ticker: "SECB", companyName: "Security Bank", sector: "Financials", price: 92.1, pctChange: -1.1, marketCap: 90_000_000_000 },

  { ticker: "JFC", companyName: "Jollibee Foods Corp", sector: "Industrial", price: 245.0, pctChange: 0.8, marketCap: 270_000_000_000 },
  { ticker: "URC", companyName: "Universal Robina Corp", sector: "Industrial", price: 132.4, pctChange: -0.3, marketCap: 170_000_000_000 },
  { ticker: "MER", companyName: "Manila Electric Company", sector: "Industrial", price: 384.0, pctChange: 1.5, marketCap: 430_000_000_000 },

  { ticker: "SM", companyName: "SM Investments Corp", sector: "Holding Firms", price: 920.0, pctChange: 0.9, marketCap: 1_100_000_000_000 },
  { ticker: "AC", companyName: "Ayala Corporation", sector: "Holding Firms", price: 610.0, pctChange: -0.4, marketCap: 250_000_000_000 },
  { ticker: "JGS", companyName: "JG Summit Holdings", sector: "Holding Firms", price: 42.5, pctChange: 0.2, marketCap: 190_000_000_000 },
  { ticker: "GTCAP", companyName: "GT Capital Holdings", sector: "Holding Firms", price: 550.0, pctChange: -1.8, marketCap: 130_000_000_000 },

  { ticker: "SMPH", companyName: "SM Prime Holdings", sector: "Property", price: 27.8, pctChange: 0.5, marketCap: 640_000_000_000 },
  { ticker: "ALI", companyName: "Ayala Land Inc", sector: "Property", price: 29.4, pctChange: -0.7, marketCap: 400_000_000_000 },
  { ticker: "MEG", companyName: "Megaworld Corp", sector: "Property", price: 2.1, pctChange: 1.9, marketCap: 60_000_000_000 },
  { ticker: "RLC", companyName: "Robinsons Land Corp", sector: "Property", price: 16.2, pctChange: -0.2, marketCap: 90_000_000_000 },

  { ticker: "TEL", companyName: "PLDT Inc", sector: "Services", price: 1350.0, pctChange: 0.3, marketCap: 300_000_000_000 },
  { ticker: "GLO", companyName: "Globe Telecom", sector: "Services", price: 1780.0, pctChange: -1.0, marketCap: 210_000_000_000 },
  { ticker: "ICT", companyName: "International Container Terminal Services", sector: "Services", price: 315.0, pctChange: 2.1, marketCap: 340_000_000_000 },

  { ticker: "NIKL", companyName: "Nickel Asia Corp", sector: "Mining & Oil", price: 4.6, pctChange: -2.3, marketCap: 30_000_000_000 },
  { ticker: "SCC", companyName: "Semirara Mining and Power Corp", sector: "Mining & Oil", price: 33.5, pctChange: 1.1, marketCap: 60_000_000_000 },
];
