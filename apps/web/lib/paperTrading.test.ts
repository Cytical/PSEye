import { describe, expect, it } from "vitest";
import { computeCashBalance, PAPER_STARTING_CASH } from "./paperTrading";
import type { Transaction } from "./transactions";

function tx(overrides: Partial<Transaction> & Pick<Transaction, "ticker" | "type" | "shares" | "price" | "date">): Transaction {
  return { id: `${overrides.ticker}-${overrides.date}-${overrides.type}-${Math.random()}`, ...overrides };
}

describe("computeCashBalance", () => {
  it("starts at PAPER_STARTING_CASH with no transactions", () => {
    expect(computeCashBalance([])).toBe(PAPER_STARTING_CASH);
  });

  it("debits a buy's cost (and fee) from cash", () => {
    const cash = computeCashBalance([tx({ ticker: "A", type: "buy", shares: 100, price: 10, date: "2026-01-01", fee: 20 })]);
    expect(cash).toBe(PAPER_STARTING_CASH - 1020);
  });

  it("credits a sell's net proceeds (after fee) to cash", () => {
    const cash = computeCashBalance([
      tx({ ticker: "A", type: "buy", shares: 100, price: 10, date: "2026-01-01" }),
      tx({ ticker: "A", type: "sell", shares: 100, price: 12, date: "2026-01-02", fee: 15 }),
    ]);
    // 100000 - 1000 + (1200 - 15)
    expect(cash).toBe(PAPER_STARTING_CASH - 1000 + 1185);
  });

  it("accepts a custom starting balance", () => {
    expect(computeCashBalance([], 50_000)).toBe(50_000);
  });
});
