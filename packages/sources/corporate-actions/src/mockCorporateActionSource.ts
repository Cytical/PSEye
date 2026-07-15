import type { CorporateAction, CorporateActionSource } from "./types";

/**
 * Placeholder CorporateActionSource. A real implementation would parse PSE Edge
 * disclosure filings (cash/stock/property dividend declarations, rights and
 * follow-on offer circulars) — out of scope until that pipeline exists. Sample
 * dates are generated relative to today so the calendar always shows a mix of
 * recently-passed and upcoming actions. Swap via the CorporateActionSource
 * interface, not by editing callers.
 */
export class MockCorporateActionSource implements CorporateActionSource {
  async getUpcoming(): Promise<CorporateAction[]> {
    return SAMPLE_ACTIONS.map((a) => ({
      ...a,
      exDate: addDays(a.exDateOffset),
      recordDate: addDays(a.exDateOffset + 1),
      paymentDate: a.paymentOffset === null ? null : addDays(a.paymentOffset),
    }));
  }
}

function addDays(offset: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

interface SampleAction extends Omit<CorporateAction, "exDate" | "recordDate" | "paymentDate"> {
  exDateOffset: number;
  paymentOffset: number | null;
}

const SAMPLE_ACTIONS: SampleAction[] = [
  {
    ticker: "BDO",
    companyName: "BDO Unibank",
    type: "cash_dividend",
    details: "P1.20/share cash dividend",
    exDateOffset: -5,
    paymentOffset: 20,
  },
  {
    ticker: "TEL",
    companyName: "PLDT Inc",
    type: "cash_dividend",
    details: "P24.00/share special cash dividend",
    exDateOffset: 4,
    paymentOffset: 34,
  },
  {
    ticker: "SM",
    companyName: "SM Investments Corp",
    type: "cash_dividend",
    details: "P9.50/share regular cash dividend",
    exDateOffset: 12,
    paymentOffset: 42,
  },
  {
    ticker: "ALI",
    companyName: "Ayala Land Inc",
    type: "stock_dividend",
    details: "5% stock dividend",
    exDateOffset: 18,
    paymentOffset: 48,
  },
  {
    ticker: "JGS",
    companyName: "JG Summit Holdings",
    type: "rights_offer",
    details: "1-for-8 rights offer at P38.00/share, to fund debt refinancing",
    exDateOffset: 25,
    paymentOffset: null,
  },
  {
    ticker: "MEG",
    companyName: "Megaworld Corp",
    type: "follow_on_offer",
    details: "Follow-on offer of up to 1.2B primary shares",
    exDateOffset: 30,
    paymentOffset: null,
  },
  {
    ticker: "URC",
    companyName: "Universal Robina Corp",
    type: "cash_dividend",
    details: "P0.90/share cash dividend",
    exDateOffset: -15,
    paymentOffset: 10,
  },
  {
    ticker: "GTCAP",
    companyName: "GT Capital Holdings",
    type: "property_dividend",
    details: "Property dividend of Metrobank shares held by GT Capital",
    exDateOffset: 40,
    paymentOffset: 70,
  },
];
