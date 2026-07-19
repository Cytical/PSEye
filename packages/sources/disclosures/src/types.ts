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

/** Muted, theme-safe accent per filing type — shared by every page that lists
 * disclosures (the Disclosures digest, and the per-company /stocks/[ticker]
 * page) so a reader gets one consistent color language for "what kind of
 * filing is this" everywhere it appears, not just a page-local convention. */
export const DISCLOSURE_TYPE_ACCENT: Record<DisclosureType, string> = {
  material_information: "#2f6f9f",
  insider_trading_report: "#c2662f",
  public_ownership_report: "#8a5fc2",
  sec_filing: "#4a4a48",
  analyst_briefing: "#2f8f4e",
  other: "#7a7a76",
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
