/**
 * Real PSEi30 index constituents, by ticker. PSE curates this list itself
 * (rebalanced periodically) — it isn't derived from any QuoteSource, so it
 * lives as a static reference rather than a field on Quote. Consumed by the
 * market map's "PSEi" filter (see apps/web/lib/marketMapFilters.ts).
 */
export const PSEI_TICKERS: readonly string[] = [
  "AC",
  "ACEN",
  "AGI",
  "ALI",
  "AP",
  "BDO",
  "BLOOM",
  "BPI",
  "CNVRG",
  "DMC",
  "EMI",
  "GLO",
  "GTCAP",
  "ICT",
  "JFC",
  "JGS",
  "LTG",
  "MBT",
  "MER",
  "MONDE",
  "PGOLD",
  "RLC",
  "RRHI",
  "SCC",
  "SM",
  "SMC",
  "SMPH",
  "TEL",
  "URC",
  "WLCON",
];
