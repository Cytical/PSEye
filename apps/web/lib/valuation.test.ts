import { describe, expect, it } from "vitest";
import {
  computeValuation,
  dividendYieldPct,
  isPesoDenominated,
  priceToBook,
  priceToEarnings,
  unitScale,
  type ValuationInputs,
} from "./valuation";

/**
 * One consistent fictional company used across the scale tests: 1,000,000
 * shares at ₱100, so ₱100M market cap, ₱5M net income (EPS ₱5), ₱50M equity
 * (book value ₱50/share). Only the *unit the statement is written in* changes
 * between cases, which is exactly what unitScale is meant to detect.
 */
const SHARES = 1_000_000;
const PRICE = 100;
const MARKET_CAP = PRICE * SHARES; // 1e8
const EPS = 5;
const BVPS = 50;

function inputs(overrides: Partial<ValuationInputs> = {}): ValuationInputs {
  return {
    currencyUnit: "Php",
    price: PRICE,
    marketCap: MARKET_CAP,
    epsBasic: EPS,
    bookValuePerShare: BVPS,
    netIncomeAttributableToParent: EPS * SHARES, // raw pesos
    netIncomeAfterTax: EPS * SHARES,
    stockholdersEquityParent: BVPS * SHARES,
    stockholdersEquity: BVPS * SHARES,
    ...overrides,
  };
}

describe("priceToEarnings", () => {
  it("divides price by earnings per share", () => {
    expect(priceToEarnings(100, 5)).toBe(20);
  });

  it("returns null when the stock did not trade", () => {
    expect(priceToEarnings(null, 5)).toBeNull();
  });

  it("returns null when there is no EPS on file", () => {
    expect(priceToEarnings(100, null)).toBeNull();
  });

  it("returns null on a non-positive price rather than dividing by zero", () => {
    expect(priceToEarnings(0, 5)).toBeNull();
    expect(priceToEarnings(-1, 5)).toBeNull();
  });

  it("returns null for a loss-making company instead of a negative multiple", () => {
    expect(priceToEarnings(100, -5)).toBeNull();
    expect(priceToEarnings(100, 0)).toBeNull();
  });

  it("rejects an implausibly large multiple as a unit artifact", () => {
    expect(priceToEarnings(1000, 0.5)).toBeNull(); // 2000x
    expect(priceToEarnings(1000, 2)).toBe(500); // 500x is extreme but real
  });
});

describe("priceToBook", () => {
  it("divides price by book value per share", () => {
    expect(priceToBook(100, 50)).toBe(2);
  });

  it("returns null for negative book value", () => {
    expect(priceToBook(100, -10)).toBeNull();
  });

  it("returns null when either side is missing", () => {
    expect(priceToBook(null, 50)).toBeNull();
    expect(priceToBook(100, null)).toBeNull();
  });

  it("rejects an implausibly large multiple", () => {
    expect(priceToBook(1000, 5)).toBeNull(); // 200x
  });
});

describe("unitScale", () => {
  it("accepts a statement written in raw pesos", () => {
    const check = unitScale(EPS * SHARES, EPS, MARKET_CAP, PRICE);
    expect(check.ok).toBe(true);
    expect(check.exponent).toBe(0);
    expect(check.ratio).toBeCloseTo(1, 10);
  });

  it("accepts a statement written in thousands", () => {
    const check = unitScale((EPS * SHARES) / 1_000, EPS, MARKET_CAP, PRICE);
    expect(check.ok).toBe(true);
    expect(check.exponent).toBe(-3);
  });

  it("accepts a statement written in millions", () => {
    const check = unitScale((EPS * SHARES) / 1_000_000, EPS, MARKET_CAP, PRICE);
    expect(check.ok).toBe(true);
    expect(check.exponent).toBe(-6);
  });

  it("rejects a scale that lands between the valid regimes", () => {
    // Per-share figure itself in millions: ratio lands on 1e-9, three orders
    // past the nearest valid exponent.
    const check = unitScale((EPS * SHARES) / 1_000_000, EPS * 1_000, MARKET_CAP, PRICE);
    expect(check.ok).toBe(false);
    expect(check.exponent).toBeNull();
  });

  it("tolerates share-count drift up to a factor of ~5", () => {
    // Weighted-average share count 3x the current count still reads as pesos.
    expect(unitScale(EPS * SHARES * 3, EPS, MARKET_CAP, PRICE).ok).toBe(true);
    // A full order of magnitude does not.
    expect(unitScale(EPS * SHARES * 10, EPS, MARKET_CAP, PRICE).ok).toBe(false);
  });

  it("fails closed when any input is missing or degenerate", () => {
    expect(unitScale(null, EPS, MARKET_CAP, PRICE).ok).toBe(false);
    expect(unitScale(EPS * SHARES, null, MARKET_CAP, PRICE).ok).toBe(false);
    expect(unitScale(EPS * SHARES, EPS, MARKET_CAP, null).ok).toBe(false);
    expect(unitScale(EPS * SHARES, EPS, MARKET_CAP, 0).ok).toBe(false);
    expect(unitScale(EPS * SHARES, 0, MARKET_CAP, PRICE).ok).toBe(false);
  });

  it("fails when the implied share count comes out negative", () => {
    expect(unitScale(-EPS * SHARES, EPS, MARKET_CAP, PRICE).ok).toBe(false);
  });
});

describe("isPesoDenominated", () => {
  // Every string below is a real value observed in company_financials, not a
  // constructed example. The variety is the reason this is substring matching.
  it("accepts the peso unit strings PSE Edge actually stores", () => {
    for (const unit of [
      "Php",
      "PHP",
      "PESOS",
      "Pesos",
      "Phil. Peso",
      "In Thousand Php",
      "Php in ('000) / ratios",
      "amounts in million Php",
      "Philippine Peso (Php)",
      "in 000 Philippine Peso",
      "PhP (in Thousands)",
      "Thousands PhP",
      "In Php",
      "Php 000",
    ]) {
      expect(isPesoDenominated(unit), unit).toBe(true);
    }
  });

  it("accepts the two typo'd spellings on file", () => {
    expect(isPesoDenominated("Philppine Peso")).toBe(true);
    expect(isPesoDenominated("Philippine Curreccy")).toBe(true);
  });

  it("rejects the foreign-currency filers", () => {
    for (const unit of [
      "CSM except EPS &amp; BV", // Manulife, Canadian dollars
      "C$millions except EPS&amp;B", // Sun Life
      "in US Dollar", // IMI
      "USD (in thousands)", // First Gen
      "USD (in Thousands)", // ION
      "U.S. Dollars", // OPM
      "USD", // OGP
    ]) {
      expect(isPesoDenominated(unit), unit).toBe(false);
    }
  });

  it("fails closed on a missing or unrecognized unit", () => {
    expect(isPesoDenominated(null)).toBe(false);
    expect(isPesoDenominated("")).toBe(false);
    expect(isPesoDenominated("in thousands")).toBe(false);
  });

  it("rejects a string naming both currencies", () => {
    expect(isPesoDenominated("Php/USD")).toBe(false);
  });
});

describe("computeValuation", () => {
  it("computes both ratios when the statement is in raw pesos", () => {
    const v = computeValuation(inputs());
    expect(v.peRatio).toBeCloseTo(20, 10);
    expect(v.pbRatio).toBeCloseTo(2, 10);
    expect(v.epsNegative).toBe(false);
    expect(v.bookValueNegative).toBe(false);
  });

  it("computes the same ratios when the statement is in millions", () => {
    const v = computeValuation(
      inputs({
        netIncomeAttributableToParent: (EPS * SHARES) / 1_000_000,
        netIncomeAfterTax: (EPS * SHARES) / 1_000_000,
        stockholdersEquityParent: (BVPS * SHARES) / 1_000_000,
        stockholdersEquity: (BVPS * SHARES) / 1_000_000,
      })
    );
    expect(v.peRatio).toBeCloseTo(20, 10);
    expect(v.pbRatio).toBeCloseTo(2, 10);
  });

  it("withholds a ratio whose unit check fails rather than publishing it", () => {
    // Totals in millions but the per-share line scaled by another 1000: the
    // ratio lands on 1e-9, nowhere near a valid regime.
    const v = computeValuation(
      inputs({
        epsBasic: EPS * 1_000,
        netIncomeAttributableToParent: (EPS * SHARES) / 1_000_000,
        netIncomeAfterTax: (EPS * SHARES) / 1_000_000,
      })
    );
    expect(v.peRatio).toBeNull();
    // The book-value side is independent and still passes.
    expect(v.pbRatio).toBeCloseTo(2, 10);
  });

  it("catches a per-share line in statement units via the plausibility band", () => {
    // The failure the scale check CANNOT see: EPS quoted in millions like the
    // totals around it stays internally consistent, so the ratio still reads
    // as 1. What gives it away is the resulting multiple, 2e7. This is why
    // MAX_PLAUSIBLE_PE exists as a second net and not just belt-and-braces.
    const v = computeValuation(
      inputs({
        epsBasic: EPS / 1_000_000,
        netIncomeAttributableToParent: (EPS * SHARES) / 1_000_000,
        netIncomeAfterTax: (EPS * SHARES) / 1_000_000,
      })
    );
    expect(v.peRatio).toBeNull();
  });

  it("flags a loss-making company instead of returning a negative P/E", () => {
    const v = computeValuation(
      inputs({
        epsBasic: -3,
        netIncomeAttributableToParent: -3 * SHARES,
        netIncomeAfterTax: -3 * SHARES,
      })
    );
    expect(v.peRatio).toBeNull();
    expect(v.epsNegative).toBe(true);
  });

  it("flags negative book value", () => {
    const v = computeValuation(
      inputs({ bookValuePerShare: -10, stockholdersEquityParent: -10 * SHARES, stockholdersEquity: -10 * SHARES })
    );
    expect(v.pbRatio).toBeNull();
    expect(v.bookValueNegative).toBe(true);
  });

  it("withholds the ratio when there is no total to check the per-share figure against", () => {
    const v = computeValuation(
      inputs({ netIncomeAttributableToParent: null, netIncomeAfterTax: null })
    );
    expect(v.peRatio).toBeNull();
    // Not a loss: EPS is present and positive, we just cannot verify its unit.
    expect(v.epsNegative).toBe(false);
  });

  it("falls back to consolidated income when the parent-attributable line is absent", () => {
    const v = computeValuation(inputs({ netIncomeAttributableToParent: null }));
    expect(v.peRatio).toBeCloseTo(20, 10);
  });

  it("returns nothing at all for a stock that did not trade", () => {
    const v = computeValuation(inputs({ price: null }));
    expect(v.peRatio).toBeNull();
    expect(v.pbRatio).toBeNull();
  });

  it("withholds both ratios for a foreign-currency filer", () => {
    // The failure mode this guards: statement and EPS are internally
    // consistent, so unitScale is satisfied, but the peso price is being
    // divided by a Canadian-dollar EPS.
    const v = computeValuation(inputs({ currencyUnit: "C$millions except EPS&amp;B" }));
    expect(v.peRatio).toBeNull();
    expect(v.pbRatio).toBeNull();
  });

  it("still reports a loss for a foreign-currency filer", () => {
    // A loss is a loss in any currency, so this flag is not currency-gated.
    const v = computeValuation(inputs({ currencyUnit: "USD", epsBasic: -3 }));
    expect(v.epsNegative).toBe(true);
  });
});

describe("dividendYieldPct", () => {
  it("expresses the trailing payout as a percentage of price", () => {
    expect(dividendYieldPct(2, 50)).toBeCloseTo(4, 10);
  });

  it("returns null when the stock did not trade", () => {
    expect(dividendYieldPct(2, null)).toBeNull();
  });

  it("returns null on a non-positive price", () => {
    expect(dividendYieldPct(2, 0)).toBeNull();
    expect(dividendYieldPct(2, -5)).toBeNull();
  });

  it("returns null when nothing was paid in the trailing window", () => {
    expect(dividendYieldPct(0, 50)).toBeNull();
  });
});
