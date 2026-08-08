import { describe, expect, it } from "vitest";
import { buildRankings } from "./rankings";
import type { Quote } from "@pseye/source-quotes";

function quote(
  ticker: string,
  sector: Quote["sector"],
  marketCap: number,
  freeFloatPct?: number
): Quote {
  return { ticker, companyName: `${ticker} Corp`, sector, price: 1, pctChange: 0, marketCap, freeFloatPct };
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

  // The reason MFC/SLF specifically are float-adjusted: MFC reports a
  // ~P4.15T market cap on a 0.20% free float, against PH large caps around
  // P700B on ~45%. Ranked raw it takes #1 on shares that trade in Toronto.
  // BDO's own freeFloatPct is deliberately ignored here — only MFC/SLF get
  // float-adjusted, every other ticker (however low or high its own free
  // float) ranks on raw market cap. See @pseye/treemap-layout's
  // FLOAT_ADJUSTED_TICKERS.
  it("ranks a huge low-float dual-listing below a smaller high-float company", () => {
    const rows = buildRankings([
      quote("MFC", "Financials", 4_150_000_000_000, 0.2),
      quote("BDO", "Financials", 677_600_000_000, 44.23),
    ]);

    expect(rows.map((r) => r.ticker)).toEqual(["BDO", "MFC"]);
    expect(rows[0].investableMarketCap).toBeCloseTo(677_600_000_000, -6);
    expect(rows[1].investableMarketCap).toBeCloseTo(8_300_000_000, -6);
  });

  it("float-adjusts SLF (the other dual-listing) the same way as MFC", () => {
    const [row] = buildRankings([quote("SLF", "Financials", 1_000, 40)]);
    expect(row).toMatchObject({ marketCap: 1_000, investableMarketCap: 400, freeFloatPct: 40 });
  });

  it("does not float-adjust an ordinary domestic ticker, even with a low free float on file", () => {
    const [row] = buildRankings([quote("BDO", "Financials", 1_000, 40)]);
    expect(row).toMatchObject({ marketCap: 1_000, investableMarketCap: 1_000, freeFloatPct: 40 });
  });

  // The mock quote source doesn't set freeFloatPct, so a DB-less dev build
  // still has to produce a sane board.
  it("falls back to raw market cap when free float is unknown", () => {
    const rows = buildRankings([quote("A", "Financials", 100), quote("B", "Financials", 300)]);
    expect(rows.map((r) => r.ticker)).toEqual(["B", "A"]);
    expect(rows[0]).toMatchObject({ investableMarketCap: 300, freeFloatPct: null });
  });
});
