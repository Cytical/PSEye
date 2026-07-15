import type { BlockSale, BlockSaleSource } from "./types";

/**
 * Placeholder BlockSaleSource. A real implementation would parse the "Block
 * Sales" table out of PSE's Monthly Report PDF (documents.pse.com.ph) — out of
 * scope until a PDF-table-extraction pipeline exists (pdfplumber/camelot-style).
 * Trade dates are generated relative to today so the tracker always shows a
 * recent-looking month. Swap via the BlockSaleSource interface, not by editing
 * callers.
 */
export class MockBlockSaleSource implements BlockSaleSource {
  async getLatest(): Promise<BlockSale[]> {
    return SAMPLE_TRADES.map((t) => {
      const value = t.volume * t.price;
      return { ...t, tradeDate: addDays(t.dayOffset), value };
    }).sort((a, b) => b.value - a.value);
  }
}

function addDays(offset: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

interface SampleTrade {
  ticker: string;
  companyName: string;
  volume: number;
  price: number;
  dayOffset: number;
}

const SAMPLE_TRADES: SampleTrade[] = [
  { ticker: "SM", companyName: "SM Investments Corp", volume: 2_500_000, price: 918.0, dayOffset: -2 },
  { ticker: "BDO", companyName: "BDO Unibank", volume: 8_000_000, price: 144.8, dayOffset: -3 },
  { ticker: "AC", companyName: "Ayala Corporation", volume: 1_200_000, price: 605.0, dayOffset: -5 },
  { ticker: "TEL", companyName: "PLDT Inc", volume: 350_000, price: 1345.0, dayOffset: -6 },
  { ticker: "ALI", companyName: "Ayala Land Inc", volume: 15_000_000, price: 29.2, dayOffset: -8 },
  { ticker: "SMPH", companyName: "SM Prime Holdings", volume: 20_000_000, price: 27.6, dayOffset: -9 },
  { ticker: "MBT", companyName: "Metropolitan Bank & Trust", volume: 6_000_000, price: 68.5, dayOffset: -11 },
  { ticker: "JGS", companyName: "JG Summit Holdings", volume: 9_500_000, price: 42.1, dayOffset: -13 },
  { ticker: "ICT", companyName: "International Container Terminal Services", volume: 900_000, price: 312.0, dayOffset: -15 },
  { ticker: "GTCAP", companyName: "GT Capital Holdings", volume: 500_000, price: 545.0, dayOffset: -18 },
  { ticker: "URC", companyName: "Universal Robina Corp", volume: 3_000_000, price: 131.0, dayOffset: -21 },
  { ticker: "MEG", companyName: "Megaworld Corp", volume: 40_000_000, price: 2.08, dayOffset: -24 },
];
