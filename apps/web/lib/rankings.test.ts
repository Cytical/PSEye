import { describe, expect, it } from "vitest";
import { buildRankings } from "./rankings";
import type { Quote } from "@pseye/source-quotes";

function quote(ticker: string, sector: Quote["sector"], marketCap: number): Quote {
  return { ticker, companyName: `${ticker} Corp`, sector, price: 1, pctChange: 0, marketCap };
}

describe("buildRankings", () => {
  it("ranks by market cap descending, overall and within sector", () => {
    const rows = buildRankings([
      quote("A", "Financials", 100),
      quote("B", "Financials", 300),
      quote("C", "Industrial", 200),
    ]);

    expect(rows.map((r) => r.ticker)).toEqual(["B", "C", "A"]);
    expect(rows.find((r) => r.ticker === "B")).toMatchObject({ overallRank: 1, sectorRank: 1 });
    expect(rows.find((r) => r.ticker === "C")).toMatchObject({ overallRank: 2, sectorRank: 1 });
    expect(rows.find((r) => r.ticker === "A")).toMatchObject({ overallRank: 3, sectorRank: 2 });
  });

  it("excludes zero/negative market cap rather than ranking them last", () => {
    const rows = buildRankings([quote("A", "Financials", 0), quote("B", "Financials", 50)]);
    expect(rows).toHaveLength(1);
    expect(rows[0].ticker).toBe("B");
  });

  it("breaks ties by ticker for deterministic ordering", () => {
    const rows = buildRankings([quote("Z", "Financials", 100), quote("A", "Financials", 100)]);
    expect(rows.map((r) => r.ticker)).toEqual(["A", "Z"]);
  });
});
