import type { PseSector } from "../types";

export interface PseEdgeCompany {
  /** Ticker as PSE Edge lists it. A few of ours differed from the roster's assumed symbol — see below. */
  ticker: string;
  /** PSE Edge's internal company id — the `cmpy_id` query param `stockData.do` takes. Resolved once via `/autoComplete/searchCompanyNameSymbol.ax`, not looked up per fetch (that endpoint is a search index, not the quote itself, and the id is effectively permanent for a listed company). */
  cmpyId: string;
  companyName: string;
  sector: PseSector;
}

/**
 * Static ticker -> PSE Edge cmpy_id roster for the ~100 names this app tracks.
 * Regenerate by re-running the resolution pass (search each ticker/name against
 * `/autoComplete/searchCompanyNameSymbol.ax`) if PSE relists/renames a security.
 *
 * Three tickers from the original mock roster didn't resolve at all when checked
 * against PSE Edge and were dropped rather than shipped as permanent N/A rows:
 * MICI (Malayan Insurance), MPI (Metro Pacific Investments — went private via
 * tender offer), and 8990 (8990 Holdings). Three more resolved under a different
 * symbol than assumed and were corrected: CHIB -> CBC (China Banking), EMP -> EMI
 * (Emperador), ABRA -> AR (Abra Mining).
 */
export const PSE_EDGE_COMPANIES: readonly PseEdgeCompany[] = [
  { ticker: "BDO", cmpyId: "260", companyName: "BDO Unibank", sector: "Financials" },
  { ticker: "BPI", cmpyId: "234", companyName: "Bank of the Philippine Islands", sector: "Financials" },
  { ticker: "MBT", cmpyId: "128", companyName: "Metropolitan Bank & Trust", sector: "Financials" },
  { ticker: "CBC", cmpyId: "184", companyName: "China Banking Corp", sector: "Financials" },
  { ticker: "SECB", cmpyId: "32", companyName: "Security Bank", sector: "Financials" },
  { ticker: "PNB", cmpyId: "139", companyName: "Philippine National Bank", sector: "Financials" },
  { ticker: "UBP", cmpyId: "167", companyName: "Union Bank of the Philippines", sector: "Financials" },
  { ticker: "RCB", cmpyId: "232", companyName: "Rizal Commercial Banking Corp", sector: "Financials" },
  { ticker: "AUB", cmpyId: "641", companyName: "Asia United Bank", sector: "Financials" },
  { ticker: "EW", cmpyId: "634", companyName: "EastWest Banking Corp", sector: "Financials" },
  { ticker: "PBB", cmpyId: "640", companyName: "Philippine Business Bank", sector: "Financials" },
  { ticker: "COL", cmpyId: "601", companyName: "COL Financial Group", sector: "Financials" },
  { ticker: "PSE", cmpyId: "478", companyName: "The Philippine Stock Exchange, Inc.", sector: "Financials" },
  { ticker: "BNCOM", cmpyId: "692", companyName: "Bank of Commerce", sector: "Financials" },
  { ticker: "PBC", cmpyId: "208", companyName: "Philippine Bank of Communications", sector: "Financials" },
  { ticker: "MER", cmpyId: "118", companyName: "Manila Electric Company", sector: "Industrial" },
  { ticker: "JFC", cmpyId: "86", companyName: "Jollibee Foods Corp", sector: "Industrial" },
  { ticker: "AP", cmpyId: "609", companyName: "Aboitiz Power Corp", sector: "Industrial" },
  { ticker: "EMI", cmpyId: "632", companyName: "Emperador Inc", sector: "Industrial" },
  { ticker: "ACEN", cmpyId: "233", companyName: "ACEN Corp", sector: "Industrial" },
  { ticker: "URC", cmpyId: "124", companyName: "Universal Robina Corp", sector: "Industrial" },
  { ticker: "FGEN", cmpyId: "600", companyName: "First Gen Corp", sector: "Industrial" },
  { ticker: "CNPF", cmpyId: "652", companyName: "Century Pacific Food Inc", sector: "Industrial" },
  { ticker: "MONDE", cmpyId: "682", companyName: "Monde Nissin Corporation", sector: "Industrial" },
  { ticker: "MWIDE", cmpyId: "627", companyName: "Megawide Construction Corp", sector: "Industrial" },
  { ticker: "EEI", cmpyId: "71", companyName: "EEI Corp", sector: "Industrial" },
  { ticker: "DNL", cmpyId: "639", companyName: "D&L Industries, Inc.", sector: "Industrial" },
  { ticker: "IMI", cmpyId: "622", companyName: "Integrated Micro-Electronics, Inc.", sector: "Industrial" },
  { ticker: "SSI", cmpyId: "654", companyName: "SSI Group, Inc.", sector: "Industrial" },
  { ticker: "TECH", cmpyId: "630", companyName: "Cirtek Holdings Philippines Corporation", sector: "Industrial" },
  { ticker: "RFM", cmpyId: "77", companyName: "RFM Corporation", sector: "Industrial" },
  { ticker: "AXLM", cmpyId: "673", companyName: "Axelum Resources Corp.", sector: "Industrial" },
  { ticker: "SM", cmpyId: "599", companyName: "SM Investments Corp", sector: "Holding Firms" },
  { ticker: "AC", cmpyId: "57", companyName: "Ayala Corporation", sector: "Holding Firms" },
  { ticker: "SMC", cmpyId: "154", companyName: "San Miguel Corporation", sector: "Holding Firms" },
  { ticker: "AEV", cmpyId: "16", companyName: "Aboitiz Equity Ventures", sector: "Holding Firms" },
  { ticker: "JGS", cmpyId: "210", companyName: "JG Summit Holdings", sector: "Holding Firms" },
  { ticker: "GTCAP", cmpyId: "633", companyName: "GT Capital Holdings", sector: "Holding Firms" },
  { ticker: "AGI", cmpyId: "212", companyName: "Alliance Global Group", sector: "Holding Firms" },
  { ticker: "DMC", cmpyId: "188", companyName: "DMCI Holdings", sector: "Holding Firms" },
  { ticker: "LTG", cmpyId: "12", companyName: "LT Group", sector: "Holding Firms" },
  { ticker: "FPH", cmpyId: "197", companyName: "First Philippine Holdings Corp", sector: "Holding Firms" },
  { ticker: "ANS", cmpyId: "14", companyName: "A. Soriano Corporation", sector: "Holding Firms" },
  { ticker: "COSCO", cmpyId: "50", companyName: "Cosco Capital, Inc.", sector: "Holding Firms" },
  { ticker: "DD", cmpyId: "651", companyName: "DoubleDragon Corporation", sector: "Holding Firms" },
  { ticker: "LPZ", cmpyId: "61", companyName: "Lopez Holdings Corporation", sector: "Holding Firms" },
  { ticker: "SMPH", cmpyId: "112", companyName: "SM Prime Holdings", sector: "Property" },
  { ticker: "ALI", cmpyId: "180", companyName: "Ayala Land Inc", sector: "Property" },
  { ticker: "AREIT", cmpyId: "679", companyName: "AREIT Inc", sector: "Property" },
  { ticker: "RLC", cmpyId: "195", companyName: "Robinsons Land Corp", sector: "Property" },
  { ticker: "RCR", cmpyId: "684", companyName: "RL Commercial REIT", sector: "Property" },
  { ticker: "MEG", cmpyId: "127", companyName: "Megaworld Corp", sector: "Property" },
  { ticker: "VLL", cmpyId: "607", companyName: "Vista Land & Lifescapes", sector: "Property" },
  { ticker: "FILRT", cmpyId: "683", companyName: "Filinvest REIT Corp", sector: "Property" },
  { ticker: "FLI", cmpyId: "226", companyName: "Filinvest Land Inc", sector: "Property" },
  { ticker: "CLI", cmpyId: "668", companyName: "Cebu Landmasters Inc", sector: "Property" },
  { ticker: "CPG", cmpyId: "189", companyName: "Century Properties Group", sector: "Property" },
  { ticker: "GERI", cmpyId: "193", companyName: "Global-Estate Resorts, Inc.", sector: "Property" },
  { ticker: "SHNG", cmpyId: "218", companyName: "Shang Properties, Inc.", sector: "Property" },
  { ticker: "ELI", cmpyId: "190", companyName: "Empire East Land Holdings, Inc.", sector: "Property" },
  { ticker: "MREIT", cmpyId: "685", companyName: "MREIT, Inc.", sector: "Property" },
  { ticker: "DDMPR", cmpyId: "681", companyName: "DDMP REIT, Inc.", sector: "Property" },
  { ticker: "SLI", cmpyId: "41", companyName: "Sta. Lucia Land, Inc.", sector: "Property" },
  { ticker: "TEL", cmpyId: "6", companyName: "PLDT Inc", sector: "Services" },
  { ticker: "GLO", cmpyId: "69", companyName: "Globe Telecom", sector: "Services" },
  { ticker: "ICT", cmpyId: "83", companyName: "International Container Terminal Services", sector: "Services" },
  { ticker: "PGOLD", cmpyId: "629", companyName: "Puregold Price Club", sector: "Services" },
  { ticker: "CNVRG", cmpyId: "680", companyName: "Converge ICT Solutions", sector: "Services" },
  { ticker: "RRHI", cmpyId: "646", companyName: "Robinsons Retail Holdings", sector: "Services" },
  { ticker: "BLOOM", cmpyId: "49", companyName: "Bloomberry Resorts Corp", sector: "Services" },
  { ticker: "WLCON", cmpyId: "665", companyName: "Wilcon Depot Inc", sector: "Services" },
  { ticker: "MWC", cmpyId: "270", companyName: "Manila Water Company", sector: "Services" },
  { ticker: "CEB", cmpyId: "624", companyName: "Cebu Air Inc", sector: "Services" },
  { ticker: "MAC", cmpyId: "106", companyName: "MacroAsia Corp", sector: "Services" },
  { ticker: "CEU", cmpyId: "223", companyName: "Centro Escolar University", sector: "Services" },
  { ticker: "DFNN", cmpyId: "187", companyName: "DFNN, Inc.", sector: "Services" },
  { ticker: "PAL", cmpyId: "20", companyName: "PAL Holdings, Inc.", sector: "Services" },
  { ticker: "NOW", cmpyId: "264", companyName: "Now Corporation", sector: "Services" },
  { ticker: "GMA7", cmpyId: "610", companyName: "GMA Network, Inc.", sector: "Services" },
  { ticker: "ABS", cmpyId: "114", companyName: "ABS-CBN Holdings Corporation", sector: "Services" },
  { ticker: "DITO", cmpyId: "36", companyName: "DITO CME Holdings Corporation", sector: "Services" },
  { ticker: "PIZZA", cmpyId: "664", companyName: "Shakey's Pizza Asia Ventures, Inc.", sector: "Services" },
  { ticker: "I", cmpyId: "613", companyName: "I-Remit, Inc.", sector: "Services" },
  { ticker: "CHP", cmpyId: "662", companyName: "Chelsea Logistics and Infrastructure Holdings Corp.", sector: "Services" },
  { ticker: "SCC", cmpyId: "157", companyName: "Semirara Mining and Power Corp", sector: "Mining & Oil" },
  { ticker: "APX", cmpyId: "178", companyName: "Apex Mining Co", sector: "Mining & Oil" },
  { ticker: "PCOR", cmpyId: "136", companyName: "Petron Corporation", sector: "Mining & Oil" },
  { ticker: "PX", cmpyId: "137", companyName: "Philex Mining Corp", sector: "Mining & Oil" },
  { ticker: "NIKL", cmpyId: "625", companyName: "Nickel Asia Corp", sector: "Mining & Oil" },
  { ticker: "ORE", cmpyId: "616", companyName: "Oriental Petroleum and Minerals Corporation", sector: "Mining & Oil" },
  { ticker: "PNX", cmpyId: "608", companyName: "Phoenix Petroleum Philippines, Inc.", sector: "Mining & Oil" },
  { ticker: "AT", cmpyId: "34", companyName: "Atlas Consolidated Mining and Development Corporation", sector: "Mining & Oil" },
  { ticker: "LC", cmpyId: "98", companyName: "Lepanto Consolidated Mining Company", sector: "Mining & Oil" },
  { ticker: "MA", cmpyId: "119", companyName: "Manila Mining Corporation", sector: "Mining & Oil" },
  { ticker: "PXP", cmpyId: "628", companyName: "PXP Energy Corporation", sector: "Mining & Oil" },
  { ticker: "AR", cmpyId: "33", companyName: "Abra Mining and Industrial Corporation", sector: "Mining & Oil" },
  { ticker: "APO", cmpyId: "52", companyName: "Anglo Philippine Holdings Corporation", sector: "Mining & Oil" },
];
