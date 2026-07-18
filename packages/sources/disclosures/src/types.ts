export const DISCLOSURE_TYPES = [
  "material_information",
  "insider_trading_report",
  "public_ownership_report",
  "sec_filing",
  "analyst_briefing",
  "other",
] as const;

export type DisclosureType = (typeof DISCLOSURE_TYPES)[number];

export const DISCLOSURE_TYPE_LABELS: Record<DisclosureType, string> = {
  material_information: "Material Information",
  insider_trading_report: "Insider Trading Report",
  public_ownership_report: "Public Ownership Report",
  sec_filing: "SEC Filing",
  analyst_briefing: "Analyst Briefing",
  other: "Other Disclosure",
};

/** A single PSE Edge filing, distilled to what matters for a reader skimming the feed. */
export interface Disclosure {
  ticker: string;
  companyName: string;
  type: DisclosureType;
  headline: string;
  filedAt: string; // ISO datetime
  /** PSE Edge assigns each filing a unique reference number; used as our dedupe key. */
  referenceNo: string;
  /** Link to the real PSE Edge filing detail view; null for sample/mock filings, which have no real filing to point to. */
  url: string | null;
}

export interface DisclosureSource {
  getRecent(): Promise<Disclosure[]>;
}
