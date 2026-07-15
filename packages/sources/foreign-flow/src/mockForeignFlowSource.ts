import type { ForeignFlowSource, IndexForeignFlow, StockForeignFlow } from "./types";

/**
 * Placeholder ForeignFlowSource. A real implementation would parse the
 * index-level and per-stock foreign buying/selling tables out of PSE's weekly
 * Market Watch PDF (documents.pse.com.ph) — out of scope until a PDF-table-
 * extraction pipeline exists. Only weekly/monthly granularity is modeled;
 * true daily/intraday foreign flow needs a licensed feed (see project plan).
 * Periods are generated relative to today. Swap via the ForeignFlowSource
 * interface, not by editing callers.
 */
export class MockForeignFlowSource implements ForeignFlowSource {
  async getIndexFlow(): Promise<IndexForeignFlow[]> {
    const fridays = recentFridays(12);
    return fridays.map((periodEnd) => {
      const baseFlow = 800_000_000; // ~P800M/week baseline turnover, loosely realistic
      const netBias = 300_000_000 * pseudoNormal(`index:${periodEnd}`);
      const foreignBuyValue = Math.round(baseFlow + netBias / 2 + baseFlow * 0.15 * pseudoUnit(`buy:${periodEnd}`));
      const foreignSellValue = Math.round(baseFlow - netBias / 2 + baseFlow * 0.15 * pseudoUnit(`sell:${periodEnd}`));
      return {
        periodEnd,
        foreignBuyValue,
        foreignSellValue,
        netValue: foreignBuyValue - foreignSellValue,
      };
    });
  }

  async getTopStockFlows() {
    const periodEnd = recentFridays(1)[0];
    const topBuying: StockForeignFlow[] = TOP_BUYING.map((s, i) => ({ ...s, rank: i + 1 }));
    const topSelling: StockForeignFlow[] = TOP_SELLING.map((s, i) => ({ ...s, rank: i + 1 }));
    return { periodEnd, topBuying, topSelling };
  }
}

/** The most recent `count` Fridays on/before today, oldest first. */
function recentFridays(count: number): string[] {
  const d = new Date();
  const dow = d.getUTCDay();
  const daysSinceFriday = (dow - 5 + 7) % 7;
  d.setUTCDate(d.getUTCDate() - daysSinceFriday);

  const fridays: string[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const f = new Date(d);
    f.setUTCDate(f.getUTCDate() - i * 7);
    fridays.push(f.toISOString().slice(0, 10));
  }
  return fridays;
}

function hashToUnit(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

function pseudoUnit(seed: string): number {
  return hashToUnit(seed) * 2 - 1; // [-1, 1)
}

function pseudoNormal(seed: string): number {
  const u1 = Math.max(hashToUnit(seed + ":a"), Number.EPSILON);
  const u2 = hashToUnit(seed + ":b");
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

const TOP_BUYING: Omit<StockForeignFlow, "rank">[] = [
  { ticker: "BDO", companyName: "BDO Unibank", netValue: 412_000_000 },
  { ticker: "SM", companyName: "SM Investments Corp", netValue: 298_000_000 },
  { ticker: "ICT", companyName: "International Container Terminal Services", netValue: 187_000_000 },
  { ticker: "AC", companyName: "Ayala Corporation", netValue: 152_000_000 },
  { ticker: "URC", companyName: "Universal Robina Corp", netValue: 98_000_000 },
];

const TOP_SELLING: Omit<StockForeignFlow, "rank">[] = [
  { ticker: "TEL", companyName: "PLDT Inc", netValue: -356_000_000 },
  { ticker: "ALI", companyName: "Ayala Land Inc", netValue: -241_000_000 },
  { ticker: "MBT", companyName: "Metropolitan Bank & Trust", netValue: -165_000_000 },
  { ticker: "JGS", companyName: "JG Summit Holdings", netValue: -122_000_000 },
  { ticker: "GLO", companyName: "Globe Telecom", netValue: -87_000_000 },
];
