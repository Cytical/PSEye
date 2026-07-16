import type { TreemapStock } from "@/components/TreemapChart";

/**
 * Static Nasdaq-100 mock dataset for the market map's "Nasdaq 100" filter —
 * an intentionally separate index from PSE, so it doesn't go through the
 * QuoteSource/Quote plumbing (no DB table, no ETL job; this is a distinct
 * roster swapped in wholesale by MarketMap.tsx, not a filter over PSE
 * quotes). Ticker roster, company names, and sector groupings are real;
 * price/pctChange/marketCap are fabricated sample values, same convention as
 * packages/sources/quotes/src/mockQuoteSource.ts.
 */
const NASDAQ_100_RAW: Omit<TreemapStock, "currency">[] = [
  // Technology
  { ticker: "AAPL", companyName: "Apple Inc.", sector: "Technology", price: 195.5, pctChange: 0.8, marketCap: 3_000_000_000_000 },
  { ticker: "MSFT", companyName: "Microsoft Corporation", sector: "Technology", price: 415.2, pctChange: 0.5, marketCap: 3_100_000_000_000 },
  { ticker: "NVDA", companyName: "NVIDIA Corporation", sector: "Technology", price: 890.0, pctChange: 2.1, marketCap: 2_200_000_000_000 },
  { ticker: "AVGO", companyName: "Broadcom Inc.", sector: "Technology", price: 1650.0, pctChange: 1.4, marketCap: 780_000_000_000 },
  { ticker: "GOOGL", companyName: "Alphabet Inc. (Class A)", sector: "Technology", price: 172.0, pctChange: -0.3, marketCap: 2_100_000_000_000 },
  { ticker: "GOOG", companyName: "Alphabet Inc. (Class C)", sector: "Technology", price: 173.5, pctChange: -0.3, marketCap: 2_110_000_000_000 },
  { ticker: "ADBE", companyName: "Adobe Inc.", sector: "Technology", price: 480.0, pctChange: -0.6, marketCap: 210_000_000_000 },
  { ticker: "CSCO", companyName: "Cisco Systems, Inc.", sector: "Technology", price: 58.0, pctChange: 0.2, marketCap: 235_000_000_000 },
  { ticker: "AMD", companyName: "Advanced Micro Devices, Inc.", sector: "Technology", price: 165.0, pctChange: 3.2, marketCap: 267_000_000_000 },
  { ticker: "QCOM", companyName: "Qualcomm Incorporated", sector: "Technology", price: 175.0, pctChange: 0.9, marketCap: 195_000_000_000 },
  { ticker: "INTC", companyName: "Intel Corporation", sector: "Technology", price: 32.0, pctChange: -1.8, marketCap: 135_000_000_000 },
  { ticker: "TXN", companyName: "Texas Instruments Incorporated", sector: "Technology", price: 195.0, pctChange: 0.4, marketCap: 178_000_000_000 },
  { ticker: "AMAT", companyName: "Applied Materials, Inc.", sector: "Technology", price: 210.0, pctChange: 1.1, marketCap: 175_000_000_000 },
  { ticker: "INTU", companyName: "Intuit Inc.", sector: "Technology", price: 650.0, pctChange: -0.5, marketCap: 180_000_000_000 },
  { ticker: "ADI", companyName: "Analog Devices, Inc.", sector: "Technology", price: 220.0, pctChange: 0.6, marketCap: 108_000_000_000 },
  { ticker: "LRCX", companyName: "Lam Research Corporation", sector: "Technology", price: 900.0, pctChange: 1.7, marketCap: 105_000_000_000 },
  { ticker: "KLAC", companyName: "KLA Corporation", sector: "Technology", price: 750.0, pctChange: 0.9, marketCap: 95_000_000_000 },
  { ticker: "SNPS", companyName: "Synopsys, Inc.", sector: "Technology", price: 550.0, pctChange: -0.4, marketCap: 82_000_000_000 },
  { ticker: "CDNS", companyName: "Cadence Design Systems, Inc.", sector: "Technology", price: 300.0, pctChange: 0.3, marketCap: 82_000_000_000 },
  { ticker: "MU", companyName: "Micron Technology, Inc.", sector: "Technology", price: 105.0, pctChange: 4.1, marketCap: 118_000_000_000 },
  { ticker: "PANW", companyName: "Palo Alto Networks, Inc.", sector: "Technology", price: 340.0, pctChange: 1.2, marketCap: 100_000_000_000 },
  { ticker: "CRWD", companyName: "CrowdStrike Holdings, Inc.", sector: "Technology", price: 320.0, pctChange: 2.3, marketCap: 78_000_000_000 },
  { ticker: "FTNT", companyName: "Fortinet, Inc.", sector: "Technology", price: 75.0, pctChange: -0.7, marketCap: 57_000_000_000 },
  { ticker: "MRVL", companyName: "Marvell Technology, Inc.", sector: "Technology", price: 75.0, pctChange: 2.8, marketCap: 65_000_000_000 },
  { ticker: "NXPI", companyName: "NXP Semiconductors N.V.", sector: "Technology", price: 235.0, pctChange: -0.9, marketCap: 47_000_000_000 },
  { ticker: "ON", companyName: "ON Semiconductor Corporation", sector: "Technology", price: 68.0, pctChange: -1.4, marketCap: 29_000_000_000 },
  { ticker: "MCHP", companyName: "Microchip Technology Incorporated", sector: "Technology", price: 90.0, pctChange: 0.5, marketCap: 49_000_000_000 },
  { ticker: "WDAY", companyName: "Workday, Inc.", sector: "Technology", price: 260.0, pctChange: -1.1, marketCap: 68_000_000_000 },
  { ticker: "TEAM", companyName: "Atlassian Corporation", sector: "Technology", price: 195.0, pctChange: 1.6, marketCap: 51_000_000_000 },
  { ticker: "DDOG", companyName: "Datadog, Inc.", sector: "Technology", price: 130.0, pctChange: 2.0, marketCap: 42_000_000_000 },
  { ticker: "ZS", companyName: "Zscaler, Inc.", sector: "Technology", price: 195.0, pctChange: -1.3, marketCap: 28_000_000_000 },
  { ticker: "ANSS", companyName: "Ansys, Inc.", sector: "Technology", price: 340.0, pctChange: 0.2, marketCap: 34_000_000_000 },
  { ticker: "ARM", companyName: "Arm Holdings plc", sector: "Technology", price: 145.0, pctChange: 3.4, marketCap: 150_000_000_000 },
  { ticker: "SMCI", companyName: "Super Micro Computer, Inc.", sector: "Technology", price: 40.0, pctChange: -5.2, marketCap: 22_000_000_000 },
  { ticker: "GFS", companyName: "GlobalFoundries Inc.", sector: "Technology", price: 42.0, pctChange: -0.8, marketCap: 23_000_000_000 },
  { ticker: "ROP", companyName: "Roper Technologies, Inc.", sector: "Technology", price: 570.0, pctChange: 0.3, marketCap: 60_000_000_000 },
  { ticker: "CTSH", companyName: "Cognizant Technology Solutions Corporation", sector: "Technology", price: 78.0, pctChange: -0.2, marketCap: 39_000_000_000 },
  { ticker: "CDW", companyName: "CDW Corporation", sector: "Technology", price: 210.0, pctChange: -0.5, marketCap: 26_000_000_000 },
  { ticker: "PLTR", companyName: "Palantir Technologies Inc.", sector: "Technology", price: 65.0, pctChange: 4.5, marketCap: 145_000_000_000 },
  { ticker: "APP", companyName: "AppLovin Corporation", sector: "Technology", price: 340.0, pctChange: 3.9, marketCap: 115_000_000_000 },
  { ticker: "TTD", companyName: "The Trade Desk, Inc.", sector: "Technology", price: 90.0, pctChange: -2.2, marketCap: 42_000_000_000 },
  { ticker: "VRSN", companyName: "VeriSign, Inc.", sector: "Technology", price: 210.0, pctChange: 0.4, marketCap: 22_000_000_000 },
  { ticker: "MSTR", companyName: "Strategy Inc.", sector: "Technology", price: 380.0, pctChange: 6.1, marketCap: 85_000_000_000 },

  // Communication Services
  { ticker: "META", companyName: "Meta Platforms, Inc.", sector: "Communication Services", price: 590.0, pctChange: 1.3, marketCap: 1_500_000_000_000 },
  { ticker: "NFLX", companyName: "Netflix, Inc.", sector: "Communication Services", price: 700.0, pctChange: 0.9, marketCap: 300_000_000_000 },
  { ticker: "TMUS", companyName: "T-Mobile US, Inc.", sector: "Communication Services", price: 195.0, pctChange: 0.4, marketCap: 235_000_000_000 },
  { ticker: "CMCSA", companyName: "Comcast Corporation", sector: "Communication Services", price: 40.0, pctChange: -0.6, marketCap: 165_000_000_000 },
  { ticker: "CHTR", companyName: "Charter Communications, Inc.", sector: "Communication Services", price: 340.0, pctChange: -1.2, marketCap: 55_000_000_000 },
  { ticker: "WBD", companyName: "Warner Bros. Discovery, Inc.", sector: "Communication Services", price: 9.5, pctChange: -2.5, marketCap: 24_000_000_000 },
  { ticker: "EA", companyName: "Electronic Arts Inc.", sector: "Communication Services", price: 145.0, pctChange: 0.5, marketCap: 38_000_000_000 },
  { ticker: "SIRI", companyName: "Sirius XM Holdings Inc.", sector: "Communication Services", price: 24.0, pctChange: -0.3, marketCap: 7_500_000_000 },

  // Consumer Discretionary
  { ticker: "AMZN", companyName: "Amazon.com, Inc.", sector: "Consumer Discretionary", price: 185.0, pctChange: 1.1, marketCap: 1_950_000_000_000 },
  { ticker: "TSLA", companyName: "Tesla, Inc.", sector: "Consumer Discretionary", price: 250.0, pctChange: -2.8, marketCap: 800_000_000_000 },
  { ticker: "SBUX", companyName: "Starbucks Corporation", sector: "Consumer Discretionary", price: 95.0, pctChange: -0.4, marketCap: 108_000_000_000 },
  { ticker: "BKNG", companyName: "Booking Holdings Inc.", sector: "Consumer Discretionary", price: 4200.0, pctChange: 0.7, marketCap: 145_000_000_000 },
  { ticker: "ABNB", companyName: "Airbnb, Inc.", sector: "Consumer Discretionary", price: 145.0, pctChange: -0.9, marketCap: 92_000_000_000 },
  { ticker: "MAR", companyName: "Marriott International, Inc.", sector: "Consumer Discretionary", price: 250.0, pctChange: 0.3, marketCap: 68_000_000_000 },
  { ticker: "ORLY", companyName: "O'Reilly Automotive, Inc.", sector: "Consumer Discretionary", price: 1150.0, pctChange: 0.6, marketCap: 78_000_000_000 },
  { ticker: "ROST", companyName: "Ross Stores, Inc.", sector: "Consumer Discretionary", price: 150.0, pctChange: -0.2, marketCap: 47_000_000_000 },
  { ticker: "DASH", companyName: "DoorDash, Inc.", sector: "Consumer Discretionary", price: 145.0, pctChange: 2.4, marketCap: 60_000_000_000 },
  { ticker: "LULU", companyName: "Lululemon Athletica Inc.", sector: "Consumer Discretionary", price: 340.0, pctChange: -3.1, marketCap: 43_000_000_000 },
  { ticker: "EBAY", companyName: "eBay Inc.", sector: "Consumer Discretionary", price: 55.0, pctChange: 0.4, marketCap: 28_000_000_000 },
  { ticker: "PDD", companyName: "PDD Holdings Inc.", sector: "Consumer Discretionary", price: 130.0, pctChange: 1.9, marketCap: 175_000_000_000 },
  { ticker: "DLTR", companyName: "Dollar Tree, Inc.", sector: "Consumer Discretionary", price: 75.0, pctChange: -1.5, marketCap: 16_000_000_000 },
  { ticker: "MELI", companyName: "MercadoLibre, Inc.", sector: "Consumer Discretionary", price: 1850.0, pctChange: 1.2, marketCap: 95_000_000_000 },

  // Consumer Staples
  { ticker: "PEP", companyName: "PepsiCo, Inc.", sector: "Consumer Staples", price: 165.0, pctChange: -0.3, marketCap: 227_000_000_000 },
  { ticker: "MDLZ", companyName: "Mondelez International, Inc.", sector: "Consumer Staples", price: 68.0, pctChange: 0.2, marketCap: 92_000_000_000 },
  { ticker: "KHC", companyName: "The Kraft Heinz Company", sector: "Consumer Staples", price: 33.0, pctChange: -0.5, marketCap: 40_000_000_000 },
  { ticker: "KDP", companyName: "Keurig Dr Pepper Inc.", sector: "Consumer Staples", price: 32.0, pctChange: 0.3, marketCap: 46_000_000_000 },
  { ticker: "MNST", companyName: "Monster Beverage Corporation", sector: "Consumer Staples", price: 55.0, pctChange: 0.8, marketCap: 55_000_000_000 },
  { ticker: "WBA", companyName: "Walgreens Boots Alliance, Inc.", sector: "Consumer Staples", price: 11.0, pctChange: -1.9, marketCap: 9_500_000_000 },
  { ticker: "COST", companyName: "Costco Wholesale Corporation", sector: "Consumer Staples", price: 890.0, pctChange: 0.5, marketCap: 395_000_000_000 },

  // Health Care
  { ticker: "ISRG", companyName: "Intuitive Surgical, Inc.", sector: "Health Care", price: 480.0, pctChange: 0.9, marketCap: 170_000_000_000 },
  { ticker: "VRTX", companyName: "Vertex Pharmaceuticals Incorporated", sector: "Health Care", price: 470.0, pctChange: -0.6, marketCap: 122_000_000_000 },
  { ticker: "REGN", companyName: "Regeneron Pharmaceuticals, Inc.", sector: "Health Care", price: 780.0, pctChange: -1.1, marketCap: 84_000_000_000 },
  { ticker: "GILD", companyName: "Gilead Sciences, Inc.", sector: "Health Care", price: 78.0, pctChange: 0.4, marketCap: 97_000_000_000 },
  { ticker: "AMGN", companyName: "Amgen Inc.", sector: "Health Care", price: 300.0, pctChange: 0.2, marketCap: 160_000_000_000 },
  { ticker: "BIIB", companyName: "Biogen Inc.", sector: "Health Care", price: 210.0, pctChange: -0.8, marketCap: 30_000_000_000 },
  { ticker: "MRNA", companyName: "Moderna, Inc.", sector: "Health Care", price: 40.0, pctChange: -3.5, marketCap: 15_000_000_000 },
  { ticker: "IDXX", companyName: "IDEXX Laboratories, Inc.", sector: "Health Care", price: 480.0, pctChange: 0.3, marketCap: 40_000_000_000 },
  { ticker: "DXCM", companyName: "DexCom, Inc.", sector: "Health Care", price: 75.0, pctChange: 1.4, marketCap: 29_000_000_000 },
  { ticker: "GEHC", companyName: "GE HealthCare Technologies Inc.", sector: "Health Care", price: 78.0, pctChange: -0.5, marketCap: 34_000_000_000 },
  { ticker: "ILMN", companyName: "Illumina, Inc.", sector: "Health Care", price: 130.0, pctChange: 0.9, marketCap: 17_000_000_000 },

  // Industrials
  { ticker: "HON", companyName: "Honeywell International Inc.", sector: "Industrials", price: 205.0, pctChange: 0.4, marketCap: 140_000_000_000 },
  { ticker: "CSX", companyName: "CSX Corporation", sector: "Industrials", price: 33.0, pctChange: -0.3, marketCap: 65_000_000_000 },
  { ticker: "CTAS", companyName: "Cintas Corporation", sector: "Industrials", price: 200.0, pctChange: 0.2, marketCap: 95_000_000_000 },
  { ticker: "FAST", companyName: "Fastenal Company", sector: "Industrials", price: 78.0, pctChange: 0.1, marketCap: 45_000_000_000 },
  { ticker: "ODFL", companyName: "Old Dominion Freight Line, Inc.", sector: "Industrials", price: 190.0, pctChange: -0.6, marketCap: 40_000_000_000 },
  { ticker: "VRSK", companyName: "Verisk Analytics, Inc.", sector: "Industrials", price: 260.0, pctChange: 0.3, marketCap: 34_000_000_000 },
  { ticker: "PAYX", companyName: "Paychex, Inc.", sector: "Industrials", price: 130.0, pctChange: 0.2, marketCap: 48_000_000_000 },
  { ticker: "PCAR", companyName: "PACCAR Inc", sector: "Industrials", price: 105.0, pctChange: -0.4, marketCap: 38_000_000_000 },
  { ticker: "CPRT", companyName: "Copart, Inc.", sector: "Industrials", price: 55.0, pctChange: 0.6, marketCap: 27_000_000_000 },
  { ticker: "ADP", companyName: "Automatic Data Processing, Inc.", sector: "Industrials", price: 245.0, pctChange: 0.3, marketCap: 100_000_000_000 },

  // Utilities
  { ticker: "AEP", companyName: "American Electric Power Company, Inc.", sector: "Utilities", price: 92.0, pctChange: 0.2, marketCap: 47_000_000_000 },
  { ticker: "EXC", companyName: "Exelon Corporation", sector: "Utilities", price: 38.0, pctChange: -0.2, marketCap: 42_000_000_000 },
  { ticker: "XEL", companyName: "Xcel Energy Inc.", sector: "Utilities", price: 62.0, pctChange: 0.3, marketCap: 34_000_000_000 },
  { ticker: "CEG", companyName: "Constellation Energy Corporation", sector: "Utilities", price: 210.0, pctChange: 1.8, marketCap: 66_000_000_000 },

  // Materials & Energy
  { ticker: "LIN", companyName: "Linde plc", sector: "Materials & Energy", price: 440.0, pctChange: 0.3, marketCap: 215_000_000_000 },
  { ticker: "FANG", companyName: "Diamondback Energy, Inc.", sector: "Materials & Energy", price: 175.0, pctChange: -1.6, marketCap: 52_000_000_000 },

  // Financials
  { ticker: "PYPL", companyName: "PayPal Holdings, Inc.", sector: "Financials", price: 72.0, pctChange: -0.9, marketCap: 78_000_000_000 },
];

export const NASDAQ_100_STOCKS: TreemapStock[] = NASDAQ_100_RAW.map((stock) => ({ ...stock, currency: "USD" }));
