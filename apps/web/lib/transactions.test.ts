import { describe, expect, it } from "vitest";
import { computePositions, migrateLegacyEntries, sharesHeld, type Transaction } from "./transactions";

function tx(overrides: Partial<Transaction> & Pick<Transaction, "ticker" | "type" | "shares" | "price" | "date">): Transaction {
  return { id: `${overrides.ticker}-${overrides.date}-${overrides.type}-${Math.random()}`, ...overrides };
}

describe("migrateLegacyEntries", () => {
  it("converts a legacy {ticker,shares,avgCost} row into an opening buy transaction", () => {
    const result = migrateLegacyEntries([{ ticker: "BDO", shares: 100, avgCost: 120.5 }]);
    expect(result).toEqual([
      { id: "legacy-BDO-0", ticker: "BDO", type: "buy", shares: 100, price: 120.5, date: "2000-01-01" },
    ]);
  });

  it("passes through entries that are already transactions", () => {
    const existing: Transaction = { id: "tx-1", ticker: "BDO", type: "sell", shares: 10, price: 130, date: "2026-01-05" };
    expect(migrateLegacyEntries([existing])).toEqual([existing]);
  });

  it("drops entries matching neither shape", () => {
    expect(migrateLegacyEntries([{ garbage: true }, null, 42])).toEqual([]);
  });
});

describe("computePositions", () => {
  it("accumulates multiple buys into one position with a weighted-average cost", () => {
    const { positions } = computePositions([
      tx({ ticker: "A", type: "buy", shares: 100, price: 10, date: "2026-01-01" }),
      tx({ ticker: "A", type: "buy", shares: 100, price: 20, date: "2026-02-01" }),
    ]);
    expect(positions).toEqual([{ ticker: "A", shares: 200, avgCost: 15 }]);
  });

  it("matches a sell against the oldest lot first (FIFO) and records realized gain", () => {
    const { positions, realizedGains, totalRealizedGain } = computePositions([
      tx({ ticker: "A", type: "buy", shares: 100, price: 10, date: "2026-01-01" }),
      tx({ ticker: "A", type: "buy", shares: 100, price: 20, date: "2026-02-01" }),
      tx({ ticker: "A", type: "sell", shares: 100, price: 25, date: "2026-03-01" }),
    ]);
    // Sells the first (₱10) lot, not a blend: proceeds 2500, cost 1000, gain 1500.
    expect(realizedGains).toEqual([{ ticker: "A", date: "2026-03-01", shares: 100, proceeds: 2500, costBasis: 1000, gain: 1500 }]);
    expect(totalRealizedGain).toBe(1500);
    // Remaining position is entirely the second (₱20) lot.
    expect(positions).toEqual([{ ticker: "A", shares: 100, avgCost: 20 }]);
  });

  it("drops a ticker from positions once fully sold, but keeps its realized gain", () => {
    const { positions, realizedGains } = computePositions([
      tx({ ticker: "A", type: "buy", shares: 50, price: 10, date: "2026-01-01" }),
      tx({ ticker: "A", type: "sell", shares: 50, price: 12, date: "2026-01-15" }),
    ]);
    expect(positions).toEqual([]);
    expect(realizedGains).toEqual([{ ticker: "A", date: "2026-01-15", shares: 50, proceeds: 600, costBasis: 500, gain: 100 }]);
  });

  it("sorts by date, not array order, so a sell can't match a lot entered after it", () => {
    const { positions, realizedGains } = computePositions([
      // Entered out of chronological order.
      tx({ ticker: "A", type: "sell", shares: 50, price: 15, date: "2026-02-01" }),
      tx({ ticker: "A", type: "buy", shares: 100, price: 10, date: "2026-01-01" }),
    ]);
    expect(realizedGains[0].costBasis).toBe(500); // matched against the ₱10 lot, correctly the earlier one
    expect(positions).toEqual([{ ticker: "A", shares: 50, avgCost: 10 }]);
  });

  it("caps an oversell at the shares actually on record rather than going negative", () => {
    const { positions, realizedGains } = computePositions([
      tx({ ticker: "A", type: "buy", shares: 10, price: 10, date: "2026-01-01" }),
      tx({ ticker: "A", type: "sell", shares: 30, price: 12, date: "2026-01-02" }),
    ]);
    expect(realizedGains[0].shares).toBe(10);
    expect(positions).toEqual([]);
  });

  it("keeps positions for separate tickers independent", () => {
    const { positions } = computePositions([
      tx({ ticker: "A", type: "buy", shares: 10, price: 10, date: "2026-01-01" }),
      tx({ ticker: "B", type: "buy", shares: 5, price: 100, date: "2026-01-01" }),
    ]);
    expect(positions).toEqual([
      { ticker: "A", shares: 10, avgCost: 10 },
      { ticker: "B", shares: 5, avgCost: 100 },
    ]);
  });

  it("folds a buy's fee into cost basis (avgCost reflects what it actually cost to acquire)", () => {
    const { positions } = computePositions([tx({ ticker: "A", type: "buy", shares: 100, price: 10, date: "2026-01-01", fee: 50 })]);
    // (100*10 + 50) / 100 = 10.5
    expect(positions).toEqual([{ ticker: "A", shares: 100, avgCost: 10.5 }]);
  });

  it("nets a sell's fee out of proceeds and realized gain", () => {
    const { realizedGains } = computePositions([
      tx({ ticker: "A", type: "buy", shares: 100, price: 10, date: "2026-01-01" }),
      tx({ ticker: "A", type: "sell", shares: 100, price: 15, date: "2026-02-01", fee: 30 }),
    ]);
    // proceeds = 100*15 - 30 = 1470, cost 1000, gain 470 (not 500 if the fee were ignored).
    expect(realizedGains[0]).toMatchObject({ proceeds: 1470, costBasis: 1000, gain: 470 });
  });

  it("treats a missing fee as 0, unchanged from before fee tracking existed", () => {
    const { positions } = computePositions([tx({ ticker: "A", type: "buy", shares: 10, price: 10, date: "2026-01-01" })]);
    expect(positions).toEqual([{ ticker: "A", shares: 10, avgCost: 10 }]);
  });

  it("prorates a sell's fee to the shares actually matched on an oversell", () => {
    const { realizedGains } = computePositions([
      tx({ ticker: "A", type: "buy", shares: 10, price: 10, date: "2026-01-01" }),
      // Fee of 20 quoted against a 30-share sell, but only 10 shares are on record.
      tx({ ticker: "A", type: "sell", shares: 30, price: 12, date: "2026-01-02", fee: 20 }),
    ]);
    // Only 1/3 of the fee (≈6.67) applies to the 10 matched shares.
    expect(realizedGains[0].proceeds).toBeCloseTo(120 - 20 / 3);
  });
});

describe("sharesHeld", () => {
  it("returns 0 for a ticker with no transactions", () => {
    expect(sharesHeld([], "A")).toBe(0);
  });

  it("returns the current position size for a held ticker", () => {
    const transactions = [
      tx({ ticker: "A", type: "buy", shares: 100, price: 10, date: "2026-01-01" }),
      tx({ ticker: "A", type: "sell", shares: 40, price: 12, date: "2026-01-02" }),
    ];
    expect(sharesHeld(transactions, "A")).toBe(60);
  });
});
