export const OFFERING_TYPES = ["ipo", "follow_on", "stock_rights"] as const;

export type OfferingType = (typeof OFFERING_TYPES)[number];

export const OFFERING_TYPE_LABELS: Record<OfferingType, string> = {
  ipo: "IPO",
  follow_on: "Follow-on Offer",
  stock_rights: "Stock Rights Offer",
};

export interface Offering {
  /** Null before listing day — pre-IPO companies don't have a ticker yet. */
  ticker: string | null;
  companyName: string;
  sector: string;
  type: OfferingType;
  offerPrice: number;
  subscriptionStart: string; // YYYY-MM-DD
  subscriptionEnd: string;
  listingDate: string | null;
  /** Plain-language context: what the company does and what proceeds fund. */
  summary: string;
  /** Link to the company's real PSE Edge page; null for pre-IPO/fictional companies with no ticker. */
  url: string | null;
}

export interface OfferingSource {
  getUpcoming(): Promise<Offering[]>;
}
