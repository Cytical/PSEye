import { describe, expect, it } from "vitest";
import { buildVolumeLeaders } from "./volumeLeaders";
import type { Quote } from "@pseye/source-quotes";

function quote(ticker: string, value: number | null, volume: number | null): Quote {
  return {
    ticker,
    companyName: `${ticker} Corp`,
    sector: "Financials",
    price: 1,
    pctChange: 0,
    marketCap: 1,
    value,
    volume,
  };
}

describe("buildVolumeLeaders", () => {
  it("ranks by ₱ value (turnover) descending, not raw share volume", () => {
    const rows = buildVolumeLeaders([
      quote("LOWVAL_HIGHVOL", 1_000, 50_000_000),
      quote("HIGHVAL_LOWVOL", 500_000, 500),
    ]);
    expect(rows.map((r) => r.ticker)).toEqual(["HIGHVAL_LOWVOL", "LOWVAL_HIGHVOL"]);
    expect(rows[0].rank).toBe(1);
    expect(rows[1].rank).toBe(2);
  });

  it("excludes quotes with no volume/value on record rather than ranking them last", () => {
    const rows = buildVolumeLeaders([quote("A", null, null), quote("B", 100, 10)]);
    expect(rows).toHaveLength(1);
    expect(rows[0].ticker).toBe("B");
  });

  it("excludes a quote with value/volume of exactly 0 (not a real trade)", () => {
    const rows = buildVolumeLeaders([quote("A", 0, 0), quote("B", 100, 10)]);
    expect(rows).toHaveLength(1);
    expect(rows[0].ticker).toBe("B");
  });

  it("breaks ties by ticker for deterministic ordering", () => {
    const rows = buildVolumeLeaders([quote("Z", 100, 10), quote("A", 100, 10)]);
    expect(rows.map((r) => r.ticker)).toEqual(["A", "Z"]);
  });
});
