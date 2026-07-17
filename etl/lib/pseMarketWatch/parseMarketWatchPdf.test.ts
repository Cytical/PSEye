import { describe, expect, it } from "vitest";
import { tryParsePage, type TextItem } from "./parseMarketWatchPdf";

/**
 * Coordinates mirror a real Weekly Market Watch PDF's page 3 (verified live,
 * "Jul 06 - Jul 10, 2026" issue) — text runs land within ~0.5pt of their
 * label's y in that PDF, and the three date columns (prior week / current
 * week / year-to-date) run left-to-right by x, which is what this fixture
 * exercises.
 */
const REAL_LAYOUT_ITEMS: TextItem[] = [
  { str: "Jul 06 - Jul 10, 2026", x: 699.48, y: 566.88 },
  { str: "Jun 29 - Jul 03", x: 214.34, y: 500.14 },
  { str: "Jul 06 - Jul 10", x: 331.25, y: 500.14 },
  { str: "Year-to-Date", x: 441.31, y: 500.14 },
  { str: "Foreign Buying", x: 40.43, y: 436.54 },
  { str: "13,568,746,582.43", x: 229.22, y: 437.02 },
  { str: "18,263,956,192.43", x: 343.61, y: 437.02 },
  { str: "478,300,203,917.54", x: 441.55, y: 437.02 },
  { str: "Foreign Selling", x: 40.43, y: 424.06 },
  { str: "13,578,650,296.61", x: 229.22, y: 424.54 },
  { str: "14,641,667,816.38", x: 343.61, y: 424.54 },
  { str: "486,110,977,472.86", x: 441.55, y: 424.54 },
];

describe("tryParsePage", () => {
  it("extracts the current (rightmost) week's foreign buy/sell figures", () => {
    expect(tryParsePage(REAL_LAYOUT_ITEMS)).toEqual({
      periodEnd: "2026-07-10",
      foreignBuyValue: 18_263_956_192.43,
      foreignSellValue: 14_641_667_816.38,
      netValue: 3_622_288_376.05,
    });
  });

  it("parses a parenthesized (negative) value", () => {
    const items = REAL_LAYOUT_ITEMS.map((it) =>
      it.str === "14,641,667,816.38" ? { ...it, str: "(14,641,667,816.38)" } : it
    );
    const result = tryParsePage(items);
    expect(result?.foreignSellValue).toBe(-14_641_667_816.38);
  });

  it("returns null when the week-range column headers are missing", () => {
    const items = REAL_LAYOUT_ITEMS.filter((it) => !it.str.match(/^\w{3} \d{2} - \w{3} \d{2}$/));
    expect(tryParsePage(items)).toBeNull();
  });

  it("returns null when the Foreign Buying/Selling labels are missing", () => {
    const items = REAL_LAYOUT_ITEMS.filter((it) => it.str !== "Foreign Buying" && it.str !== "Foreign Selling");
    expect(tryParsePage(items)).toBeNull();
  });

  it("returns null when the page banner (with year) is missing", () => {
    const items = REAL_LAYOUT_ITEMS.filter((it) => it.str !== "Jul 06 - Jul 10, 2026");
    expect(tryParsePage(items)).toBeNull();
  });

  it("returns null for an unrelated page with no matching structure", () => {
    expect(tryParsePage([{ str: "Weekly Top Price Gainers", x: 10, y: 10 }])).toBeNull();
  });
});
