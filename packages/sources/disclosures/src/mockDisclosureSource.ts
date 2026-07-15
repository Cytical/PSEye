import type { Disclosure, DisclosureSource } from "./types";

/**
 * Placeholder DisclosureSource. A real implementation would poll PSE Edge
 * (edge.pse.com.ph) and distill its raw filing stream into this shape — out of
 * scope until that pipeline exists. Timestamps are generated relative to now so
 * the digest always looks like a live feed. Swap via the DisclosureSource
 * interface, not by editing callers.
 */
export class MockDisclosureSource implements DisclosureSource {
  async getRecent(): Promise<Disclosure[]> {
    return SAMPLE_DISCLOSURES.map((d, i) => ({
      ...d,
      filedAt: hoursAgo(d.hoursAgoOffset),
      referenceNo: `SAMPLE-${new Date().getUTCFullYear()}-${String(i + 1).padStart(4, "0")}`,
    })).sort((a, b) => b.filedAt.localeCompare(a.filedAt));
  }
}

function hoursAgo(hours: number): string {
  const d = new Date();
  d.setUTCHours(d.getUTCHours() - hours);
  return d.toISOString();
}

interface SampleDisclosure extends Omit<Disclosure, "filedAt" | "referenceNo"> {
  hoursAgoOffset: number;
}

const SAMPLE_DISCLOSURES: SampleDisclosure[] = [
  {
    ticker: "BDO",
    companyName: "BDO Unibank",
    type: "material_information",
    headline: "BDO Unibank declares P1.20/share cash dividend",
    hoursAgoOffset: 3,
  },
  {
    ticker: "TEL",
    companyName: "PLDT Inc",
    type: "insider_trading_report",
    headline: "Director acquires 5,000 common shares",
    hoursAgoOffset: 6,
  },
  {
    ticker: "SM",
    companyName: "SM Investments Corp",
    type: "sec_filing",
    headline: "SM Investments Corp files SEC Form 17-Q for the quarter",
    hoursAgoOffset: 10,
  },
  {
    ticker: "ALI",
    companyName: "Ayala Land Inc",
    type: "public_ownership_report",
    headline: "Public Ownership Report as of quarter-end filed",
    hoursAgoOffset: 18,
  },
  {
    ticker: "JGS",
    companyName: "JG Summit Holdings",
    type: "material_information",
    headline: "JG Summit Holdings announces P38.00/share rights offer",
    hoursAgoOffset: 22,
  },
  {
    ticker: "TEL",
    companyName: "PLDT Inc",
    type: "analyst_briefing",
    headline: "PLDT to hold analyst briefing on full-year results",
    hoursAgoOffset: 30,
  },
  {
    ticker: "MER",
    companyName: "Manila Electric Company",
    type: "insider_trading_report",
    headline: "Officer disposes of 12,000 common shares",
    hoursAgoOffset: 40,
  },
  {
    ticker: "AC",
    companyName: "Ayala Corporation",
    type: "material_information",
    headline: "Ayala Corporation completes stake sale in a subsidiary",
    hoursAgoOffset: 52,
  },
  {
    ticker: "BDO",
    companyName: "BDO Unibank",
    type: "sec_filing",
    headline: "BDO Unibank files SEC Form 23-A (change in beneficial ownership)",
    hoursAgoOffset: 60,
  },
];
