import { unstable_cache } from "next/cache";
import { createDb, getNasdaqQuotes } from "@pseye/db";
import type { TreemapStock } from "@/components/TreemapChart";

/**
 * Static roster for the market map's "Nasdaq 100" filter — an intentionally
 * separate index from PSE, so it doesn't go through the QuoteSource/Quote
 * plumbing (this is a distinct roster swapped in wholesale by
 * MarketMap.tsx, not a filter over PSE quotes). Ticker roster, company
 * names, sector groupings, and the one-line `description` on each stock are
 * real and static; price/pctChange/marketCap below are fabricated
 * placeholders, same convention as packages/sources/quotes/src/mockQuoteSource.ts —
 * used as-is only when nasdaq_quotes has no row for that ticker yet (DB
 * unpopulated, or fetch-nasdaq100 hasn't run). `getNasdaq100Stocks()` below
 * is the real DB-backed-with-mock-fallback entry point; components should
 * use that, not this array, directly. `description` feeds
 * CompanyDetailPanel's "About" section as a fallback when profileByTicker
 * (DB-backed, PSE-only) has no entry for the ticker — see TreemapChart.tsx.
 */
const NASDAQ_100_RAW: Omit<TreemapStock, "currency">[] = [
  // Technology
  { ticker: "AAPL", companyName: "Apple Inc.", sector: "Technology", price: 195.5, pctChange: 0.8, marketCap: 3_000_000_000_000, description: "Designs and sells the iPhone, Mac, iPad, and other consumer electronics, along with services like the App Store and iCloud." },
  { ticker: "MSFT", companyName: "Microsoft Corporation", sector: "Technology", price: 415.2, pctChange: 0.5, marketCap: 3_100_000_000_000, description: "Makes the Windows operating system, Office productivity software, and the Azure cloud computing platform." },
  { ticker: "NVDA", companyName: "NVIDIA Corporation", sector: "Technology", price: 890.0, pctChange: 2.1, marketCap: 2_200_000_000_000, description: "Designs graphics processing units and AI accelerator chips used in gaming, data centers, and machine learning." },
  { ticker: "AVGO", companyName: "Broadcom Inc.", sector: "Technology", price: 1650.0, pctChange: 1.4, marketCap: 780_000_000_000, description: "Designs semiconductors and infrastructure software for networking, wireless, and enterprise data centers." },
  { ticker: "GOOGL", companyName: "Alphabet Inc. (Class A)", sector: "Technology", price: 172.0, pctChange: -0.3, marketCap: 2_100_000_000_000, description: "Parent company of Google, running search, advertising, YouTube, Android, and cloud computing. Class A shares carry voting rights." },
  { ticker: "GOOG", companyName: "Alphabet Inc. (Class C)", sector: "Technology", price: 173.5, pctChange: -0.3, marketCap: 2_110_000_000_000, description: "Alphabet's Class C shares, covering the same Google businesses as GOOGL but with no voting rights." },
  { ticker: "ADBE", companyName: "Adobe Inc.", sector: "Technology", price: 480.0, pctChange: -0.6, marketCap: 210_000_000_000, description: "Makes creative software such as Photoshop and Acrobat, plus marketing and document cloud services." },
  { ticker: "CSCO", companyName: "Cisco Systems, Inc.", sector: "Technology", price: 58.0, pctChange: 0.2, marketCap: 235_000_000_000, description: "Makes networking hardware, software, and cybersecurity products that run much of the internet's infrastructure." },
  { ticker: "AMD", companyName: "Advanced Micro Devices, Inc.", sector: "Technology", price: 165.0, pctChange: 3.2, marketCap: 267_000_000_000, description: "Designs CPUs and GPUs that compete with Intel and NVIDIA across PCs, servers, and gaming." },
  { ticker: "QCOM", companyName: "Qualcomm Incorporated", sector: "Technology", price: 175.0, pctChange: 0.9, marketCap: 195_000_000_000, description: "Designs mobile chipsets and holds patents on wireless technology used in most smartphones." },
  { ticker: "INTC", companyName: "Intel Corporation", sector: "Technology", price: 32.0, pctChange: -1.8, marketCap: 135_000_000_000, description: "Designs and manufactures computer processors, and is one of the few chip companies that also fabricates its own." },
  { ticker: "TXN", companyName: "Texas Instruments Incorporated", sector: "Technology", price: 195.0, pctChange: 0.4, marketCap: 178_000_000_000, description: "Makes analog and embedded semiconductors used across industrial and automotive electronics." },
  { ticker: "AMAT", companyName: "Applied Materials, Inc.", sector: "Technology", price: 210.0, pctChange: 1.1, marketCap: 175_000_000_000, description: "Supplies the equipment used to manufacture semiconductor chips and displays." },
  { ticker: "INTU", companyName: "Intuit Inc.", sector: "Technology", price: 650.0, pctChange: -0.5, marketCap: 180_000_000_000, description: "Makes financial software including TurboTax, QuickBooks, and Credit Karma." },
  { ticker: "ADI", companyName: "Analog Devices, Inc.", sector: "Technology", price: 220.0, pctChange: 0.6, marketCap: 108_000_000_000, description: "Designs analog and mixed-signal chips used in sensors, industrial equipment, and communications gear." },
  { ticker: "LRCX", companyName: "Lam Research Corporation", sector: "Technology", price: 900.0, pctChange: 1.7, marketCap: 105_000_000_000, description: "Makes wafer fabrication equipment used to etch and deposit materials in chipmaking." },
  { ticker: "KLAC", companyName: "KLA Corporation", sector: "Technology", price: 750.0, pctChange: 0.9, marketCap: 95_000_000_000, description: "Makes process control and inspection equipment used to catch defects in chip manufacturing." },
  { ticker: "SNPS", companyName: "Synopsys, Inc.", sector: "Technology", price: 550.0, pctChange: -0.4, marketCap: 82_000_000_000, description: "Makes electronic design automation software that engineers use to design chips." },
  { ticker: "CDNS", companyName: "Cadence Design Systems, Inc.", sector: "Technology", price: 300.0, pctChange: 0.3, marketCap: 82_000_000_000, description: "Makes electronic design automation software for chip and system design, a close competitor to Synopsys." },
  { ticker: "MU", companyName: "Micron Technology, Inc.", sector: "Technology", price: 105.0, pctChange: 4.1, marketCap: 118_000_000_000, description: "Makes memory and storage chips, including DRAM and NAND flash." },
  { ticker: "PANW", companyName: "Palo Alto Networks, Inc.", sector: "Technology", price: 340.0, pctChange: 1.2, marketCap: 100_000_000_000, description: "Makes network security appliances and cloud cybersecurity products." },
  { ticker: "CRWD", companyName: "CrowdStrike Holdings, Inc.", sector: "Technology", price: 320.0, pctChange: 2.3, marketCap: 78_000_000_000, description: "Makes cloud-based endpoint security and threat detection software." },
  { ticker: "FTNT", companyName: "Fortinet, Inc.", sector: "Technology", price: 75.0, pctChange: -0.7, marketCap: 57_000_000_000, description: "Makes network security appliances and cybersecurity software." },
  { ticker: "MRVL", companyName: "Marvell Technology, Inc.", sector: "Technology", price: 75.0, pctChange: 2.8, marketCap: 65_000_000_000, description: "Designs semiconductors for data infrastructure, including networking and storage chips." },
  { ticker: "NXPI", companyName: "NXP Semiconductors N.V.", sector: "Technology", price: 235.0, pctChange: -0.9, marketCap: 47_000_000_000, description: "Designs chips for automotive, industrial, and IoT applications." },
  { ticker: "ON", companyName: "ON Semiconductor Corporation", sector: "Technology", price: 68.0, pctChange: -1.4, marketCap: 29_000_000_000, description: "Makes power and sensing chips used in electric vehicles and industrial systems." },
  { ticker: "MCHP", companyName: "Microchip Technology Incorporated", sector: "Technology", price: 90.0, pctChange: 0.5, marketCap: 49_000_000_000, description: "Makes microcontrollers and analog chips for embedded systems." },
  { ticker: "WDAY", companyName: "Workday, Inc.", sector: "Technology", price: 260.0, pctChange: -1.1, marketCap: 68_000_000_000, description: "Makes cloud software for human resources and financial management." },
  { ticker: "TEAM", companyName: "Atlassian Corporation", sector: "Technology", price: 195.0, pctChange: 1.6, marketCap: 51_000_000_000, description: "Makes collaboration and software development tools, including Jira and Confluence." },
  { ticker: "DDOG", companyName: "Datadog, Inc.", sector: "Technology", price: 130.0, pctChange: 2.0, marketCap: 42_000_000_000, description: "Makes cloud monitoring and observability software for tracking application performance." },
  { ticker: "ZS", companyName: "Zscaler, Inc.", sector: "Technology", price: 195.0, pctChange: -1.3, marketCap: 28_000_000_000, description: "Makes cloud-based network security services built around a zero-trust model." },
  { ticker: "ANSS", companyName: "Ansys, Inc.", sector: "Technology", price: 340.0, pctChange: 0.2, marketCap: 34_000_000_000, description: "Makes engineering simulation software used to test product designs virtually." },
  { ticker: "ARM", companyName: "Arm Holdings plc", sector: "Technology", price: 145.0, pctChange: 3.4, marketCap: 150_000_000_000, description: "Licenses chip architecture and designs used in most of the world's smartphones." },
  { ticker: "SMCI", companyName: "Super Micro Computer, Inc.", sector: "Technology", price: 40.0, pctChange: -5.2, marketCap: 22_000_000_000, description: "Makes high-performance servers and storage systems for data centers." },
  { ticker: "GFS", companyName: "GlobalFoundries Inc.", sector: "Technology", price: 42.0, pctChange: -0.8, marketCap: 23_000_000_000, description: "A contract semiconductor manufacturer that fabricates chips designed by other companies." },
  { ticker: "ROP", companyName: "Roper Technologies, Inc.", sector: "Technology", price: 570.0, pctChange: 0.3, marketCap: 60_000_000_000, description: "A diversified holding company that owns niche software and engineered-products businesses." },
  { ticker: "CTSH", companyName: "Cognizant Technology Solutions Corporation", sector: "Technology", price: 78.0, pctChange: -0.2, marketCap: 39_000_000_000, description: "Provides IT consulting and outsourcing services." },
  { ticker: "CDW", companyName: "CDW Corporation", sector: "Technology", price: 210.0, pctChange: -0.5, marketCap: 26_000_000_000, description: "Resells and integrates computer hardware, software, and IT services for businesses." },
  { ticker: "PLTR", companyName: "Palantir Technologies Inc.", sector: "Technology", price: 65.0, pctChange: 4.5, marketCap: 145_000_000_000, description: "Makes data analytics software used by government and enterprise clients." },
  { ticker: "APP", companyName: "AppLovin Corporation", sector: "Technology", price: 340.0, pctChange: 3.9, marketCap: 115_000_000_000, description: "Makes mobile app marketing and advertising technology." },
  { ticker: "TTD", companyName: "The Trade Desk, Inc.", sector: "Technology", price: 90.0, pctChange: -2.2, marketCap: 42_000_000_000, description: "Operates a programmatic advertising platform for buying digital ad space." },
  { ticker: "VRSN", companyName: "VeriSign, Inc.", sector: "Technology", price: 210.0, pctChange: 0.4, marketCap: 22_000_000_000, description: "Operates the domain name registry behind .com and .net web addresses." },
  { ticker: "MSTR", companyName: "Strategy Inc.", sector: "Technology", price: 380.0, pctChange: 6.1, marketCap: 85_000_000_000, description: "Sells business analytics software and holds a large corporate bitcoin treasury (formerly MicroStrategy)." },

  // Communication Services
  { ticker: "META", companyName: "Meta Platforms, Inc.", sector: "Communication Services", price: 590.0, pctChange: 1.3, marketCap: 1_500_000_000_000, description: "Owns Facebook, Instagram, and WhatsApp, and builds virtual and augmented reality hardware." },
  { ticker: "NFLX", companyName: "Netflix, Inc.", sector: "Communication Services", price: 700.0, pctChange: 0.9, marketCap: 300_000_000_000, description: "Operates a subscription streaming service for films and television series." },
  { ticker: "TMUS", companyName: "T-Mobile US, Inc.", sector: "Communication Services", price: 195.0, pctChange: 0.4, marketCap: 235_000_000_000, description: "A wireless carrier providing mobile phone and broadband service." },
  { ticker: "CMCSA", companyName: "Comcast Corporation", sector: "Communication Services", price: 40.0, pctChange: -0.6, marketCap: 165_000_000_000, description: "Provides cable television and internet service, and owns NBCUniversal." },
  { ticker: "CHTR", companyName: "Charter Communications, Inc.", sector: "Communication Services", price: 340.0, pctChange: -1.2, marketCap: 55_000_000_000, description: "Provides cable television, internet, and phone service under the Spectrum brand." },
  { ticker: "WBD", companyName: "Warner Bros. Discovery, Inc.", sector: "Communication Services", price: 9.5, pctChange: -2.5, marketCap: 24_000_000_000, description: "Owns film studios and cable networks, and operates the HBO Max streaming service." },
  { ticker: "EA", companyName: "Electronic Arts Inc.", sector: "Communication Services", price: 145.0, pctChange: 0.5, marketCap: 38_000_000_000, description: "Develops and publishes video games, including EA Sports FC and The Sims." },
  { ticker: "SIRI", companyName: "Sirius XM Holdings Inc.", sector: "Communication Services", price: 24.0, pctChange: -0.3, marketCap: 7_500_000_000, description: "Operates satellite radio and streaming audio subscription services." },

  // Consumer Discretionary
  { ticker: "AMZN", companyName: "Amazon.com, Inc.", sector: "Consumer Discretionary", price: 185.0, pctChange: 1.1, marketCap: 1_950_000_000_000, description: "Runs the largest e-commerce marketplace in the US and the AWS cloud computing platform." },
  { ticker: "TSLA", companyName: "Tesla, Inc.", sector: "Consumer Discretionary", price: 250.0, pctChange: -2.8, marketCap: 800_000_000_000, description: "Designs and manufactures electric vehicles and energy storage products." },
  { ticker: "SBUX", companyName: "Starbucks Corporation", sector: "Consumer Discretionary", price: 95.0, pctChange: -0.4, marketCap: 108_000_000_000, description: "Operates a global chain of coffeehouses." },
  { ticker: "BKNG", companyName: "Booking Holdings Inc.", sector: "Consumer Discretionary", price: 4200.0, pctChange: 0.7, marketCap: 145_000_000_000, description: "Operates online travel booking sites including Booking.com and Priceline." },
  { ticker: "ABNB", companyName: "Airbnb, Inc.", sector: "Consumer Discretionary", price: 145.0, pctChange: -0.9, marketCap: 92_000_000_000, description: "Runs an online marketplace for short-term lodging and travel experiences." },
  { ticker: "MAR", companyName: "Marriott International, Inc.", sector: "Consumer Discretionary", price: 250.0, pctChange: 0.3, marketCap: 68_000_000_000, description: "Franchises and manages hotel brands worldwide." },
  { ticker: "ORLY", companyName: "O'Reilly Automotive, Inc.", sector: "Consumer Discretionary", price: 1150.0, pctChange: 0.6, marketCap: 78_000_000_000, description: "Sells auto parts through a retail store chain." },
  { ticker: "ROST", companyName: "Ross Stores, Inc.", sector: "Consumer Discretionary", price: 150.0, pctChange: -0.2, marketCap: 47_000_000_000, description: "Operates off-price apparel and home goods discount stores." },
  { ticker: "DASH", companyName: "DoorDash, Inc.", sector: "Consumer Discretionary", price: 145.0, pctChange: 2.4, marketCap: 60_000_000_000, description: "Operates a food and goods delivery platform." },
  { ticker: "LULU", companyName: "Lululemon Athletica Inc.", sector: "Consumer Discretionary", price: 340.0, pctChange: -3.1, marketCap: 43_000_000_000, description: "Designs and sells athletic apparel." },
  { ticker: "EBAY", companyName: "eBay Inc.", sector: "Consumer Discretionary", price: 55.0, pctChange: 0.4, marketCap: 28_000_000_000, description: "Operates an online marketplace for auction and fixed-price sales." },
  { ticker: "PDD", companyName: "PDD Holdings Inc.", sector: "Consumer Discretionary", price: 130.0, pctChange: 1.9, marketCap: 175_000_000_000, description: "Operates the Pinduoduo and Temu e-commerce platforms." },
  { ticker: "DLTR", companyName: "Dollar Tree, Inc.", sector: "Consumer Discretionary", price: 75.0, pctChange: -1.5, marketCap: 16_000_000_000, description: "Operates discount variety retail stores." },
  { ticker: "MELI", companyName: "MercadoLibre, Inc.", sector: "Consumer Discretionary", price: 1850.0, pctChange: 1.2, marketCap: 95_000_000_000, description: "Operates e-commerce and digital payments platforms across Latin America." },

  // Consumer Staples
  { ticker: "PEP", companyName: "PepsiCo, Inc.", sector: "Consumer Staples", price: 165.0, pctChange: -0.3, marketCap: 227_000_000_000, description: "Makes snacks and beverages including Pepsi, Lay's, and Gatorade." },
  { ticker: "MDLZ", companyName: "Mondelez International, Inc.", sector: "Consumer Staples", price: 68.0, pctChange: 0.2, marketCap: 92_000_000_000, description: "Makes snack foods including Oreo, Cadbury, and Ritz." },
  { ticker: "KHC", companyName: "The Kraft Heinz Company", sector: "Consumer Staples", price: 33.0, pctChange: -0.5, marketCap: 40_000_000_000, description: "Makes packaged foods and condiments including Heinz ketchup and Kraft cheese." },
  { ticker: "KDP", companyName: "Keurig Dr Pepper Inc.", sector: "Consumer Staples", price: 32.0, pctChange: 0.3, marketCap: 46_000_000_000, description: "Makes coffee systems and beverages including Dr Pepper and Snapple." },
  { ticker: "MNST", companyName: "Monster Beverage Corporation", sector: "Consumer Staples", price: 55.0, pctChange: 0.8, marketCap: 55_000_000_000, description: "Makes energy drinks." },
  { ticker: "WBA", companyName: "Walgreens Boots Alliance, Inc.", sector: "Consumer Staples", price: 11.0, pctChange: -1.9, marketCap: 9_500_000_000, description: "Operates retail pharmacy chains." },
  { ticker: "COST", companyName: "Costco Wholesale Corporation", sector: "Consumer Staples", price: 890.0, pctChange: 0.5, marketCap: 395_000_000_000, description: "Operates membership-based warehouse retail stores." },

  // Health Care
  { ticker: "ISRG", companyName: "Intuitive Surgical, Inc.", sector: "Health Care", price: 480.0, pctChange: 0.9, marketCap: 170_000_000_000, description: "Makes the da Vinci robotic surgical systems." },
  { ticker: "VRTX", companyName: "Vertex Pharmaceuticals Incorporated", sector: "Health Care", price: 470.0, pctChange: -0.6, marketCap: 122_000_000_000, description: "Develops drugs for cystic fibrosis and other serious diseases." },
  { ticker: "REGN", companyName: "Regeneron Pharmaceuticals, Inc.", sector: "Health Care", price: 780.0, pctChange: -1.1, marketCap: 84_000_000_000, description: "Develops biotech drugs including treatments for eye disease and immunology." },
  { ticker: "GILD", companyName: "Gilead Sciences, Inc.", sector: "Health Care", price: 78.0, pctChange: 0.4, marketCap: 97_000_000_000, description: "Develops antiviral drugs including HIV and hepatitis treatments." },
  { ticker: "AMGN", companyName: "Amgen Inc.", sector: "Health Care", price: 300.0, pctChange: 0.2, marketCap: 160_000_000_000, description: "Develops biotechnology drugs for cancer, bone disease, and inflammation." },
  { ticker: "BIIB", companyName: "Biogen Inc.", sector: "Health Care", price: 210.0, pctChange: -0.8, marketCap: 30_000_000_000, description: "Develops drugs for neurological diseases including multiple sclerosis and Alzheimer's." },
  { ticker: "MRNA", companyName: "Moderna, Inc.", sector: "Health Care", price: 40.0, pctChange: -3.5, marketCap: 15_000_000_000, description: "Develops mRNA-based vaccines and therapeutics." },
  { ticker: "IDXX", companyName: "IDEXX Laboratories, Inc.", sector: "Health Care", price: 480.0, pctChange: 0.3, marketCap: 40_000_000_000, description: "Makes diagnostic tests and equipment for veterinary medicine." },
  { ticker: "DXCM", companyName: "DexCom, Inc.", sector: "Health Care", price: 75.0, pctChange: 1.4, marketCap: 29_000_000_000, description: "Makes continuous glucose monitoring devices for diabetes management." },
  { ticker: "GEHC", companyName: "GE HealthCare Technologies Inc.", sector: "Health Care", price: 78.0, pctChange: -0.5, marketCap: 34_000_000_000, description: "Makes medical imaging equipment and diagnostic devices." },
  { ticker: "ILMN", companyName: "Illumina, Inc.", sector: "Health Care", price: 130.0, pctChange: 0.9, marketCap: 17_000_000_000, description: "Makes gene sequencing systems used in genomic research." },

  // Industrials
  { ticker: "HON", companyName: "Honeywell International Inc.", sector: "Industrials", price: 205.0, pctChange: 0.4, marketCap: 140_000_000_000, description: "Makes aerospace, building automation, and industrial equipment." },
  { ticker: "CSX", companyName: "CSX Corporation", sector: "Industrials", price: 33.0, pctChange: -0.3, marketCap: 65_000_000_000, description: "Operates a freight railroad network in the eastern United States." },
  { ticker: "CTAS", companyName: "Cintas Corporation", sector: "Industrials", price: 200.0, pctChange: 0.2, marketCap: 95_000_000_000, description: "Provides uniform rental and other business services." },
  { ticker: "FAST", companyName: "Fastenal Company", sector: "Industrials", price: 78.0, pctChange: 0.1, marketCap: 45_000_000_000, description: "Distributes industrial and construction fasteners and supplies." },
  { ticker: "ODFL", companyName: "Old Dominion Freight Line, Inc.", sector: "Industrials", price: 190.0, pctChange: -0.6, marketCap: 40_000_000_000, description: "Operates a less-than-truckload freight trucking network." },
  { ticker: "VRSK", companyName: "Verisk Analytics, Inc.", sector: "Industrials", price: 260.0, pctChange: 0.3, marketCap: 34_000_000_000, description: "Provides data analytics for the insurance industry." },
  { ticker: "PAYX", companyName: "Paychex, Inc.", sector: "Industrials", price: 130.0, pctChange: 0.2, marketCap: 48_000_000_000, description: "Provides payroll and human resources outsourcing services." },
  { ticker: "PCAR", companyName: "PACCAR Inc", sector: "Industrials", price: 105.0, pctChange: -0.4, marketCap: 38_000_000_000, description: "Manufactures heavy-duty trucks under the Kenworth and Peterbilt brands." },
  { ticker: "CPRT", companyName: "Copart, Inc.", sector: "Industrials", price: 55.0, pctChange: 0.6, marketCap: 27_000_000_000, description: "Operates online auctions for salvage and used vehicles." },
  { ticker: "ADP", companyName: "Automatic Data Processing, Inc.", sector: "Industrials", price: 245.0, pctChange: 0.3, marketCap: 100_000_000_000, description: "Provides payroll processing and human capital management services." },

  // Utilities
  { ticker: "AEP", companyName: "American Electric Power Company, Inc.", sector: "Utilities", price: 92.0, pctChange: 0.2, marketCap: 47_000_000_000, description: "Generates and distributes electricity across the central and eastern US." },
  { ticker: "EXC", companyName: "Exelon Corporation", sector: "Utilities", price: 38.0, pctChange: -0.2, marketCap: 42_000_000_000, description: "A regulated electric and gas utility holding company." },
  { ticker: "XEL", companyName: "Xcel Energy Inc.", sector: "Utilities", price: 62.0, pctChange: 0.3, marketCap: 34_000_000_000, description: "Provides electricity and natural gas service across the upper Midwest." },
  { ticker: "CEG", companyName: "Constellation Energy Corporation", sector: "Utilities", price: 210.0, pctChange: 1.8, marketCap: 66_000_000_000, description: "Generates electricity, including a large nuclear power fleet." },

  // Materials & Energy
  { ticker: "LIN", companyName: "Linde plc", sector: "Materials & Energy", price: 440.0, pctChange: 0.3, marketCap: 215_000_000_000, description: "Produces and distributes industrial gases used in manufacturing, healthcare, and energy." },
  { ticker: "FANG", companyName: "Diamondback Energy, Inc.", sector: "Materials & Energy", price: 175.0, pctChange: -1.6, marketCap: 52_000_000_000, description: "Explores for and produces oil and natural gas in the Permian Basin." },

  // Financials
  { ticker: "PYPL", companyName: "PayPal Holdings, Inc.", sector: "Financials", price: 72.0, pctChange: -0.9, marketCap: 78_000_000_000, description: "Operates an online payments platform." },
];

export const NASDAQ_100_STOCKS: TreemapStock[] = NASDAQ_100_RAW.map((stock) => ({ ...stock, currency: "USD" }));

/**
 * Real DB-backed price/pctChange/marketCap where fetch-nasdaq100.ts has
 * populated a row, falling back to NASDAQ_100_STOCKS's fabricated defaults
 * per-ticker otherwise (DB unreachable, unpopulated, or missing just that
 * one ticker) — same "DB-backed when populated, else Mock, fall back on any
 * DB error too" contract as every other apps/web/lib/*.ts reader (see
 * lib/quotes.ts). companyName/sector/description never come from the DB;
 * nasdaq_quotes only carries what actually changes day to day.
 *
 * Wrapped in unstable_cache like getDailyQuotes — this is called from the
 * homepage on every render otherwise.
 */
export const getNasdaq100Stocks = unstable_cache(fetchNasdaq100Stocks, ["nasdaq-quotes"], {
  revalidate: 21600,
  tags: ["nasdaq-quotes"],
});

async function fetchNasdaq100Stocks(): Promise<TreemapStock[]> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return NASDAQ_100_STOCKS;

  try {
    const db = createDb(databaseUrl);
    const rows = await getNasdaqQuotes(db);
    if (rows.length === 0) return NASDAQ_100_STOCKS;

    const quoteByTicker = new Map(rows.map((r) => [r.ticker, r]));
    return NASDAQ_100_STOCKS.map((stock) => {
      const quote = quoteByTicker.get(stock.ticker);
      if (!quote) return stock;
      return {
        ...stock,
        price: Number(quote.price),
        pctChange: Number(quote.pctChange),
        marketCap: Number(quote.marketCap),
      };
    });
  } catch (err) {
    console.error("getNasdaq100Stocks: DB read failed, falling back to mock data", err);
    return NASDAQ_100_STOCKS;
  }
}
