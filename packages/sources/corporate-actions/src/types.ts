export const CORPORATE_ACTION_TYPES = [
  "cash_dividend",
  "stock_dividend",
  "property_dividend",
  "rights_offer",
  "follow_on_offer",
  "stock_split",
] as const;

export type CorporateActionType = (typeof CORPORATE_ACTION_TYPES)[number];

export const CORPORATE_ACTION_LABELS: Record<CorporateActionType, string> = {
  cash_dividend: "Cash Dividend",
  stock_dividend: "Stock Dividend",
  property_dividend: "Property Dividend",
  rights_offer: "Rights Offer",
  follow_on_offer: "Follow-on Offer",
  stock_split: "Stock Split",
};

/** Plain-language explainer shown next to each action type, for beginners. */
export const CORPORATE_ACTION_EXPLAINERS: Record<CorporateActionType, string> = {
  cash_dividend: "A cash payout per share, deposited by your broker on the payment date.",
  stock_dividend: "Extra shares instead of cash, credited proportionally to what you hold.",
  property_dividend:
    "A payout in the form of another asset (often shares of a related company) instead of cash.",
  rights_offer:
    "Existing shareholders may buy new shares at a set price, usually below market — you can subscribe, sell the right, or let it lapse.",
  follow_on_offer:
    "The company sells more new shares to the public, which can dilute existing holders' ownership percentage.",
  stock_split: "Existing shares are subdivided into more shares at a lower price each — your holding's total value doesn't change.",
};

export interface CorporateAction {
  ticker: string;
  companyName: string;
  type: CorporateActionType;
  /** Own the stock before this date to be entitled to the action. */
  exDate: string;
  recordDate: string;
  paymentDate: string | null;
  /** e.g. "P1.25/share cash dividend" or "1-for-10 rights offer at P25.00/share" */
  details: string;
}

export interface CorporateActionSource {
  getUpcoming(): Promise<CorporateAction[]>;
}
