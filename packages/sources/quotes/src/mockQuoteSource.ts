import type { Quote, QuoteSource } from "./types";

/**
 * Placeholder QuoteSource until Open Question #1 (a legally-sound, full-coverage
 * price feed) is resolved. Ticker roster, company names, and sectors are real
 * PSE-listed names (sector groupings are best-effort, not pulled from PSE's
 * official classification file); price/pctChange/marketCap are fabricated
 * sample values so the treemap pipeline is buildable end-to-end. Swap this out
 * via the QuoteSource interface, not by editing callers.
 *
 * Roster is sized at 100 names so the market map's Top 50 / Top 100 filters
 * (see PSEI_TICKERS and apps/web's marketMapFilters.ts) produce visibly
 * different cuts rather than all collapsing to "show everything."
 */
export class MockQuoteSource implements QuoteSource {
  async getDailyQuotes(): Promise<Quote[]> {
    return SAMPLE_QUOTES;
  }
}

export const SAMPLE_QUOTES: Quote[] = [
  // Financials
  { ticker: "BDO", companyName: "BDO Unibank", sector: "Financials", price: 145.5, pctChange: 1.2, marketCap: 680_000_000_000 },
  { ticker: "BPI", companyName: "Bank of the Philippine Islands", sector: "Financials", price: 118.3, pctChange: -0.6, marketCap: 430_000_000_000 },
  { ticker: "MBT", companyName: "Metropolitan Bank & Trust", sector: "Financials", price: 68.9, pctChange: 0.4, marketCap: 240_000_000_000 },
  { ticker: "CBC", companyName: "China Banking Corp", sector: "Financials", price: 44.0, pctChange: 0.3, marketCap: 100_000_000_000 },
  { ticker: "SECB", companyName: "Security Bank", sector: "Financials", price: 92.1, pctChange: -1.1, marketCap: 90_000_000_000 },
  { ticker: "PNB", companyName: "Philippine National Bank", sector: "Financials", price: 24.6, pctChange: 0.5, marketCap: 55_000_000_000 },
  { ticker: "UBP", companyName: "Union Bank of the Philippines", sector: "Financials", price: 44.5, pctChange: -0.9, marketCap: 65_000_000_000 },
  { ticker: "RCB", companyName: "Rizal Commercial Banking Corp", sector: "Financials", price: 28.0, pctChange: 0.6, marketCap: 60_000_000_000 },
  { ticker: "AUB", companyName: "Asia United Bank", sector: "Financials", price: 47.0, pctChange: 1.0, marketCap: 40_000_000_000 },
  { ticker: "EW", companyName: "EastWest Banking Corp", sector: "Financials", price: 9.8, pctChange: -1.4, marketCap: 30_000_000_000 },
  { ticker: "PBB", companyName: "Philippine Business Bank", sector: "Financials", price: 8.4, pctChange: 0.2, marketCap: 9_000_000_000 },
  { ticker: "COL", companyName: "COL Financial Group", sector: "Financials", price: 3.2, pctChange: -0.5, marketCap: 6_000_000_000 },
  { ticker: "PSE", companyName: "The Philippine Stock Exchange, Inc.", sector: "Financials", price: 200.0, pctChange: 0.8, marketCap: 6_000_000_000 },
  { ticker: "BNCOM", companyName: "Bank of Commerce", sector: "Financials", price: 24.0, pctChange: -0.3, marketCap: 15_000_000_000 },
  { ticker: "MICI", companyName: "Malayan Insurance Co., Inc.", sector: "Financials", price: 260.0, pctChange: 0.5, marketCap: 8_000_000_000 },
  { ticker: "PBC", companyName: "Philippine Bank of Communications", sector: "Financials", price: 15.0, pctChange: 0.4, marketCap: 4_000_000_000 },

  // Industrial
  { ticker: "MER", companyName: "Manila Electric Company", sector: "Industrial", price: 384.0, pctChange: 1.5, marketCap: 430_000_000_000 },
  { ticker: "JFC", companyName: "Jollibee Foods Corp", sector: "Industrial", price: 245.0, pctChange: 0.8, marketCap: 270_000_000_000 },
  { ticker: "AP", companyName: "Aboitiz Power Corp", sector: "Industrial", price: 39.5, pctChange: 1.3, marketCap: 300_000_000_000 },
  { ticker: "EMI", companyName: "Emperador Inc", sector: "Industrial", price: 16.2, pctChange: -0.3, marketCap: 220_000_000_000 },
  { ticker: "ACEN", companyName: "ACEN Corp", sector: "Industrial", price: 4.1, pctChange: 2.4, marketCap: 160_000_000_000 },
  { ticker: "URC", companyName: "Universal Robina Corp", sector: "Industrial", price: 132.4, pctChange: -0.3, marketCap: 170_000_000_000 },
  { ticker: "FGEN", companyName: "First Gen Corp", sector: "Industrial", price: 18.9, pctChange: -0.8, marketCap: 90_000_000_000 },
  { ticker: "CNPF", companyName: "Century Pacific Food Inc", sector: "Industrial", price: 34.8, pctChange: 0.4, marketCap: 90_000_000_000 },
  { ticker: "MONDE", companyName: "Monde Nissin Corporation", sector: "Industrial", price: 8.9, pctChange: 1.1, marketCap: 60_000_000_000 },
  { ticker: "MWIDE", companyName: "Megawide Construction Corp", sector: "Industrial", price: 3.6, pctChange: 0.9, marketCap: 8_000_000_000 },
  { ticker: "EEI", companyName: "EEI Corp", sector: "Industrial", price: 8.0, pctChange: -1.6, marketCap: 10_000_000_000 },
  { ticker: "DNL", companyName: "D&L Industries, Inc.", sector: "Industrial", price: 8.5, pctChange: 0.6, marketCap: 30_000_000_000 },
  { ticker: "IMI", companyName: "Integrated Micro-Electronics, Inc.", sector: "Industrial", price: 3.4, pctChange: -1.2, marketCap: 12_000_000_000 },
  { ticker: "SSI", companyName: "SSI Group, Inc.", sector: "Industrial", price: 1.9, pctChange: 0.9, marketCap: 6_000_000_000 },
  { ticker: "TECH", companyName: "Cirtek Holdings Philippines Corporation", sector: "Industrial", price: 6.2, pctChange: 1.8, marketCap: 5_000_000_000 },
  { ticker: "RFM", companyName: "RFM Corporation", sector: "Industrial", price: 4.6, pctChange: -0.4, marketCap: 12_000_000_000 },
  { ticker: "AXLM", companyName: "Axelum Resources Corp.", sector: "Industrial", price: 1.1, pctChange: 2.6, marketCap: 3_000_000_000 },

  // Holding Firms
  { ticker: "SM", companyName: "SM Investments Corp", sector: "Holding Firms", price: 920.0, pctChange: 0.9, marketCap: 1_100_000_000_000 },
  { ticker: "AC", companyName: "Ayala Corporation", sector: "Holding Firms", price: 610.0, pctChange: -0.4, marketCap: 250_000_000_000 },
  { ticker: "SMC", companyName: "San Miguel Corporation", sector: "Holding Firms", price: 92.0, pctChange: -1.2, marketCap: 260_000_000_000 },
  { ticker: "AEV", companyName: "Aboitiz Equity Ventures", sector: "Holding Firms", price: 47.0, pctChange: 1.0, marketCap: 260_000_000_000 },
  { ticker: "JGS", companyName: "JG Summit Holdings", sector: "Holding Firms", price: 42.5, pctChange: 0.2, marketCap: 190_000_000_000 },
  { ticker: "GTCAP", companyName: "GT Capital Holdings", sector: "Holding Firms", price: 550.0, pctChange: -1.8, marketCap: 130_000_000_000 },
  { ticker: "AGI", companyName: "Alliance Global Group", sector: "Holding Firms", price: 11.4, pctChange: 0.7, marketCap: 90_000_000_000 },
  { ticker: "DMC", companyName: "DMCI Holdings", sector: "Holding Firms", price: 13.8, pctChange: -0.5, marketCap: 90_000_000_000 },
  { ticker: "MPI", companyName: "Metro Pacific Investments Corp", sector: "Holding Firms", price: 4.7, pctChange: -0.6, marketCap: 90_000_000_000 },
  { ticker: "LTG", companyName: "LT Group", sector: "Holding Firms", price: 9.6, pctChange: 0.3, marketCap: 80_000_000_000 },
  { ticker: "FPH", companyName: "First Philippine Holdings Corp", sector: "Holding Firms", price: 58.0, pctChange: 0.2, marketCap: 40_000_000_000 },
  { ticker: "ANS", companyName: "A. Soriano Corporation", sector: "Holding Firms", price: 24.0, pctChange: -0.6, marketCap: 20_000_000_000 },
  { ticker: "COSCO", companyName: "Cosco Capital, Inc.", sector: "Holding Firms", price: 13.2, pctChange: 0.7, marketCap: 60_000_000_000 },
  { ticker: "DD", companyName: "DoubleDragon Corporation", sector: "Holding Firms", price: 9.0, pctChange: 1.3, marketCap: 20_000_000_000 },
  { ticker: "LPZ", companyName: "Lopez Holdings Corporation", sector: "Holding Firms", price: 3.8, pctChange: -0.5, marketCap: 25_000_000_000 },

  // Property
  { ticker: "SMPH", companyName: "SM Prime Holdings", sector: "Property", price: 27.8, pctChange: 0.5, marketCap: 640_000_000_000 },
  { ticker: "ALI", companyName: "Ayala Land Inc", sector: "Property", price: 29.4, pctChange: -0.7, marketCap: 400_000_000_000 },
  { ticker: "AREIT", companyName: "AREIT Inc", sector: "Property", price: 33.0, pctChange: 0.5, marketCap: 90_000_000_000 },
  { ticker: "RLC", companyName: "Robinsons Land Corp", sector: "Property", price: 16.2, pctChange: -0.2, marketCap: 90_000_000_000 },
  { ticker: "RCR", companyName: "RL Commercial REIT", sector: "Property", price: 5.4, pctChange: -0.2, marketCap: 60_000_000_000 },
  { ticker: "MEG", companyName: "Megaworld Corp", sector: "Property", price: 2.1, pctChange: 1.9, marketCap: 60_000_000_000 },
  { ticker: "VLL", companyName: "Vista Land & Lifescapes", sector: "Property", price: 2.0, pctChange: -1.8, marketCap: 30_000_000_000 },
  { ticker: "FILRT", companyName: "Filinvest REIT Corp", sector: "Property", price: 2.6, pctChange: 0.3, marketCap: 30_000_000_000 },
  { ticker: "FLI", companyName: "Filinvest Land Inc", sector: "Property", price: 0.98, pctChange: 1.4, marketCap: 25_000_000_000 },
  { ticker: "CLI", companyName: "Cebu Landmasters Inc", sector: "Property", price: 4.9, pctChange: 1.7, marketCap: 15_000_000_000 },
  { ticker: "CPG", companyName: "Century Properties Group", sector: "Property", price: 0.36, pctChange: -0.9, marketCap: 6_000_000_000 },
  { ticker: "GERI", companyName: "Global-Estate Resorts, Inc.", sector: "Property", price: 0.94, pctChange: 1.1, marketCap: 15_000_000_000 },
  { ticker: "SHNG", companyName: "Shang Properties, Inc.", sector: "Property", price: 5.7, pctChange: -0.4, marketCap: 8_000_000_000 },
  { ticker: "8990", companyName: "8990 Holdings, Inc.", sector: "Property", price: 8.9, pctChange: 0.6, marketCap: 20_000_000_000 },
  { ticker: "ELI", companyName: "Empire East Land Holdings, Inc.", sector: "Property", price: 0.31, pctChange: -1.6, marketCap: 4_000_000_000 },
  { ticker: "MREIT", companyName: "MREIT, Inc.", sector: "Property", price: 12.5, pctChange: 0.4, marketCap: 40_000_000_000 },
  { ticker: "DDMPR", companyName: "DDMP REIT, Inc.", sector: "Property", price: 1.3, pctChange: -0.8, marketCap: 15_000_000_000 },
  { ticker: "SLI", companyName: "Sta. Lucia Land, Inc.", sector: "Property", price: 2.9, pctChange: 0.3, marketCap: 6_000_000_000 },

  // Services
  { ticker: "TEL", companyName: "PLDT Inc", sector: "Services", price: 1350.0, pctChange: 0.3, marketCap: 300_000_000_000 },
  { ticker: "GLO", companyName: "Globe Telecom", sector: "Services", price: 1780.0, pctChange: -1.0, marketCap: 210_000_000_000 },
  { ticker: "ICT", companyName: "International Container Terminal Services", sector: "Services", price: 315.0, pctChange: 2.1, marketCap: 340_000_000_000 },
  { ticker: "PGOLD", companyName: "Puregold Price Club", sector: "Services", price: 34.0, pctChange: 0.6, marketCap: 110_000_000_000 },
  { ticker: "CNVRG", companyName: "Converge ICT Solutions", sector: "Services", price: 13.5, pctChange: -2.1, marketCap: 90_000_000_000 },
  { ticker: "RRHI", companyName: "Robinsons Retail Holdings", sector: "Services", price: 55.0, pctChange: -0.4, marketCap: 90_000_000_000 },
  { ticker: "BLOOM", companyName: "Bloomberry Resorts Corp", sector: "Services", price: 4.6, pctChange: 2.0, marketCap: 90_000_000_000 },
  { ticker: "WLCON", companyName: "Wilcon Depot Inc", sector: "Services", price: 17.6, pctChange: 1.2, marketCap: 60_000_000_000 },
  { ticker: "MWC", companyName: "Manila Water Company", sector: "Services", price: 32.0, pctChange: 0.3, marketCap: 60_000_000_000 },
  { ticker: "CEB", companyName: "Cebu Air Inc", sector: "Services", price: 42.0, pctChange: -1.5, marketCap: 30_000_000_000 },
  { ticker: "MAC", companyName: "MacroAsia Corp", sector: "Services", price: 6.8, pctChange: 0.8, marketCap: 8_000_000_000 },
  { ticker: "CEU", companyName: "Centro Escolar University", sector: "Services", price: 13.0, pctChange: 0.2, marketCap: 3_000_000_000 },
  { ticker: "DFNN", companyName: "DFNN, Inc.", sector: "Services", price: 4.5, pctChange: 3.1, marketCap: 2_000_000_000 },
  { ticker: "PAL", companyName: "PAL Holdings, Inc.", sector: "Services", price: 5.2, pctChange: -2.0, marketCap: 15_000_000_000 },
  { ticker: "NOW", companyName: "Now Corporation", sector: "Services", price: 1.6, pctChange: 1.4, marketCap: 8_000_000_000 },
  { ticker: "GMA7", companyName: "GMA Network, Inc.", sector: "Services", price: 8.2, pctChange: -0.5, marketCap: 20_000_000_000 },
  { ticker: "ABS", companyName: "ABS-CBN Holdings Corporation", sector: "Services", price: 4.0, pctChange: 0.0, marketCap: 25_000_000_000 },
  { ticker: "DITO", companyName: "DITO CME Holdings Corporation", sector: "Services", price: 1.9, pctChange: -1.9, marketCap: 40_000_000_000 },
  { ticker: "PIZZA", companyName: "Shakey's Pizza Asia Ventures, Inc.", sector: "Services", price: 12.6, pctChange: 0.7, marketCap: 15_000_000_000 },
  { ticker: "I", companyName: "I-Remit, Inc.", sector: "Services", price: 1.2, pctChange: 0.9, marketCap: 1_000_000_000 },
  { ticker: "CHP", companyName: "Chelsea Logistics and Infrastructure Holdings Corp.", sector: "Services", price: 3.3, pctChange: -0.6, marketCap: 10_000_000_000 },

  // Mining & Oil
  { ticker: "SCC", companyName: "Semirara Mining and Power Corp", sector: "Mining & Oil", price: 33.5, pctChange: 1.1, marketCap: 60_000_000_000 },
  { ticker: "APX", companyName: "Apex Mining Co", sector: "Mining & Oil", price: 20.0, pctChange: 3.2, marketCap: 45_000_000_000 },
  { ticker: "PCOR", companyName: "Petron Corporation", sector: "Mining & Oil", price: 3.1, pctChange: -1.0, marketCap: 40_000_000_000 },
  { ticker: "PX", companyName: "Philex Mining Corp", sector: "Mining & Oil", price: 4.4, pctChange: 1.6, marketCap: 30_000_000_000 },
  { ticker: "NIKL", companyName: "Nickel Asia Corp", sector: "Mining & Oil", price: 4.6, pctChange: -2.3, marketCap: 30_000_000_000 },
  { ticker: "ORE", companyName: "Oriental Petroleum and Minerals Corporation", sector: "Mining & Oil", price: 0.012, pctChange: 4.3, marketCap: 2_000_000_000 },
  { ticker: "PNX", companyName: "Phoenix Petroleum Philippines, Inc.", sector: "Mining & Oil", price: 8.5, pctChange: -1.3, marketCap: 15_000_000_000 },
  { ticker: "AT", companyName: "Atlas Consolidated Mining and Development Corporation", sector: "Mining & Oil", price: 9.8, pctChange: 2.9, marketCap: 20_000_000_000 },
  { ticker: "LC", companyName: "Lepanto Consolidated Mining Company", sector: "Mining & Oil", price: 0.85, pctChange: -3.1, marketCap: 8_000_000_000 },
  { ticker: "MA", companyName: "Manila Mining Corporation", sector: "Mining & Oil", price: 0.021, pctChange: 5.0, marketCap: 3_000_000_000 },
  { ticker: "PXP", companyName: "PXP Energy Corporation", sector: "Mining & Oil", price: 4.9, pctChange: 1.0, marketCap: 12_000_000_000 },
  { ticker: "AR", companyName: "Abra Mining and Industrial Corporation", sector: "Mining & Oil", price: 1.4, pctChange: -2.5, marketCap: 4_000_000_000 },
  { ticker: "APO", companyName: "Anglo Philippine Holdings Corporation", sector: "Mining & Oil", price: 4.2, pctChange: 0.6, marketCap: 6_000_000_000 },
];
