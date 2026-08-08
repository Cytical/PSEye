import { describe, expect, it } from "vitest";
import { parseTransactionsCsv, transactionsToCsv } from "./portfolioCsv";
import type { Transaction } from "./transactions";

const TICKERS = new Set(["BDO", "SM"]);

describe("transactionsToCsv", () => {
  it("serializes transactions with a header row, fee defaulting to 0", () => {
    const transactions: Transaction[] = [
      { id: "1", ticker: "BDO", type: "buy", shares: 100, price: 120.5, date: "2026-01-01" },
    ];
    expect(transactionsToCsv(transactions)).toBe("ticker,type,shares,price,date,fee\nBDO,buy,100,120.5,2026-01-01,0");
  });

  it("prints a set fee", () => {
    const transactions: Transaction[] = [
      { id: "1", ticker: "BDO", type: "buy", shares: 100, price: 120.5, date: "2026-01-01", fee: 45.5 },
    ];
    expect(transactionsToCsv(transactions)).toContain("BDO,buy,100,120.5,2026-01-01,45.5");
  });
});

describe("parseTransactionsCsv", () => {
  it("round-trips what transactionsToCsv produces", () => {
    const transactions: Transaction[] = [
      { id: "1", ticker: "BDO", type: "buy", shares: 100, price: 120.5, date: "2026-01-01", fee: 45.5 },
      { id: "2", ticker: "SM", type: "sell", shares: 10, price: 500, date: "2026-02-01" },
    ];
    const { transactions: parsed, errors } = parseTransactionsCsv(transactionsToCsv(transactions), TICKERS);
    expect(errors).toEqual([]);
    expect(parsed).toEqual([
      { ticker: "BDO", type: "buy", shares: 100, price: 120.5, date: "2026-01-01", fee: 45.5 },
      { ticker: "SM", type: "sell", shares: 10, price: 500, date: "2026-02-01", fee: 0 },
    ]);
  });

  it("skips blank lines and a header row without failing", () => {
    const csv = "ticker,type,shares,price,date,fee\n\nBDO,buy,10,100,2026-01-01,5\n";
    const { transactions, errors } = parseTransactionsCsv(csv, TICKERS);
    expect(errors).toEqual([]);
    expect(transactions).toHaveLength(1);
  });

  it("defaults fee to 0 when the trailing column is omitted entirely (pre-fee-tracking export)", () => {
    const { transactions, errors } = parseTransactionsCsv("BDO,buy,10,100,2026-01-01", TICKERS);
    expect(errors).toEqual([]);
    expect(transactions[0].fee).toBe(0);
  });

  it("rejects a negative fee", () => {
    const { errors } = parseTransactionsCsv("BDO,buy,10,100,2026-01-01,-5", TICKERS);
    expect(errors).toHaveLength(1);
  });

  it("uppercases a lowercase ticker", () => {
    const { transactions } = parseTransactionsCsv("bdo,buy,10,100,2026-01-01", TICKERS);
    expect(transactions[0].ticker).toBe("BDO");
  });

  it("collects one error per bad row without aborting the rest of the file", () => {
    const csv = ["BDO,buy,10,100,2026-01-01", "NOTATICKER,buy,10,100,2026-01-01", "SM,buy,5,50,2026-01-02"].join("\n");
    const { transactions, errors } = parseTransactionsCsv(csv, TICKERS);
    expect(transactions).toHaveLength(2);
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatch(/NOTATICKER/);
  });

  it("rejects a non-positive shares or price value", () => {
    const { errors: sharesErrors } = parseTransactionsCsv("BDO,buy,0,100,2026-01-01", TICKERS);
    expect(sharesErrors).toHaveLength(1);
    const { errors: priceErrors } = parseTransactionsCsv("BDO,buy,10,-5,2026-01-01", TICKERS);
    expect(priceErrors).toHaveLength(1);
  });

  it("rejects a malformed date", () => {
    const { errors } = parseTransactionsCsv("BDO,buy,10,100,01/01/2026", TICKERS);
    expect(errors).toHaveLength(1);
  });

  it("rejects a type that isn't buy or sell", () => {
    const { errors } = parseTransactionsCsv("BDO,hold,10,100,2026-01-01", TICKERS);
    expect(errors).toHaveLength(1);
  });
});
