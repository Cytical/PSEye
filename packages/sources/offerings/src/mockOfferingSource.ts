import { PSE_EDGE_COMPANIES } from "@pseye/source-quotes";
import type { Offering, OfferingSource } from "./types";

const TICKER_TO_CMPY_ID = new Map(PSE_EDGE_COMPANIES.map((c) => [c.ticker, c.cmpyId] as const));

/**
 * Placeholder OfferingSource. A real implementation would track PSE's IPO/
 * follow-on offer disclosures and prospectus filings — out of scope until that
 * pipeline exists. Subscription windows are generated relative to today so the
 * tracker always shows a mix of open, upcoming, and just-closed offerings.
 * Swap via the OfferingSource interface, not by editing callers.
 */
export class MockOfferingSource implements OfferingSource {
  async getUpcoming(): Promise<Offering[]> {
    return SAMPLE_OFFERINGS.map((o) => ({
      ticker: o.ticker,
      companyName: o.companyName,
      sector: o.sector,
      type: o.type,
      offerPrice: o.offerPrice,
      subscriptionStart: addDays(o.subStartOffset),
      subscriptionEnd: addDays(o.subEndOffset),
      listingDate: o.listingOffset === null ? null : addDays(o.listingOffset),
      summary: o.summary,
      // This offering itself is sample data, but for the handful of sample
      // rows that reuse a real ticker (JGS, MEG), link to that company's real
      // PSE Edge page rather than fabricating a link for a fictional offer.
      url: o.ticker && TICKER_TO_CMPY_ID.has(o.ticker)
        ? `https://edge.pse.com.ph/companyInformation/form.do?cmpy_id=${TICKER_TO_CMPY_ID.get(o.ticker)}`
        : null,
    }));
  }
}

function addDays(offset: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

interface SampleOffering
  extends Omit<Offering, "subscriptionStart" | "subscriptionEnd" | "listingDate" | "url"> {
  subStartOffset: number;
  subEndOffset: number;
  listingOffset: number | null;
}

const SAMPLE_OFFERINGS: SampleOffering[] = [
  {
    ticker: null,
    companyName: "Solara Renewable Energy Corp",
    sector: "Industrial",
    type: "ipo",
    offerPrice: 18.5,
    subStartOffset: 3,
    subEndOffset: 9,
    listingOffset: 15,
    summary:
      "A solar and wind power operator raising funds to build two new plants. First-time PSE listing — no trading history yet, so there's no chart to check before subscribing.",
  },
  {
    ticker: "JGS",
    companyName: "JG Summit Holdings",
    sector: "Holding Firms",
    type: "stock_rights",
    offerPrice: 38.0,
    subStartOffset: -2,
    subEndOffset: 5,
    listingOffset: null,
    summary:
      "Existing shareholders may buy new shares at a discount to fund debt refinancing. You can subscribe, sell the right on the market, or let it lapse — lapsing dilutes your ownership percentage slightly.",
  },
  {
    ticker: "MEG",
    companyName: "Megaworld Corp",
    sector: "Property",
    type: "follow_on",
    offerPrice: 2.05,
    subStartOffset: 10,
    subEndOffset: 14,
    listingOffset: null,
    summary:
      "The company is selling additional shares to the public to fund new township developments. This increases the total share count, which can dilute existing holders unless they participate.",
  },
  {
    ticker: null,
    companyName: "ColdLink Logistics Corp",
    sector: "Services",
    type: "ipo",
    offerPrice: 12.0,
    subStartOffset: -20,
    subEndOffset: -14,
    listingOffset: -10,
    summary:
      "A cold-chain logistics operator that listed to fund warehouse expansion. Subscription has closed; shares are now trading on the exchange.",
  },
];
