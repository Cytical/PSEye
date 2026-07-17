import { describe, expect, it } from "vitest";
import { tryParsePage, type TextItem } from "./parseQuotationReportPdf";

/**
 * Coordinates mirror a real Daily Quotation Report PDF's page 12 (verified
 * live, June 30, 2026 issue, "BLOCK SALES" section) — text runs land at the
 * integer-rounded x/y positions below, with a PHP-denominated header/row
 * block immediately followed by an (in this sample, empty) USD-denominated
 * header, which is what bounds row extraction.
 */
const REAL_LAYOUT_ITEMS: TextItem[] = [
  { str: "BLOCK SALE VOLUME:", x: 36, y: 483 },
  { str: "1,675,330", x: 218, y: 483 },
  { str: "BLOCK SALE VALUE:", x: 36, y: 472 },
  { str: "Php 289,862,675.00", x: 186, y: 472 },
  { str: "BLOCK SALES", x: 36, y: 417 },
  { str: "SECURITY", x: 36, y: 395 },
  { str: "PRICE, Php", x: 156, y: 395 },
  { str: "VOLUME", x: 274, y: 395 },
  { str: "VALUE, Php", x: 372, y: 395 },
  { str: "SEVN", x: 36, y: 384 },
  { str: "32.60", x: 177, y: 384 },
  { str: "1,448,400.00", x: 263, y: 384 },
  { str: "47,217,840.00", x: 368, y: 384 },
  { str: "ICT", x: 36, y: 373 },
  { str: "887.6114", x: 166, y: 373 },
  { str: "186,930.00", x: 269, y: 373 },
  { str: "165,921,199.002", x: 360, y: 373 },
  { str: "GLO", x: 36, y: 362 },
  { str: "1,918.0909", x: 160, y: 362 },
  { str: "40,000.00", x: 273, y: 362 },
  { str: "76,723,636.00", x: 368, y: 362 },
  { str: "SECURITY", x: 36, y: 340 },
  { str: "PRICE, USD", x: 155, y: 340 },
  { str: "VOLUME", x: 274, y: 340 },
  { str: "VALUE, USD", x: 371, y: 340 },
  { str: "VWAP", x: 36, y: 318 },
];

describe("tryParsePage", () => {
  it("extracts PHP-denominated block sale rows, stopping before the USD table header", () => {
    expect(tryParsePage(REAL_LAYOUT_ITEMS)).toEqual([
      { ticker: "SEVN", price: 32.6, volume: 1_448_400, value: 47_217_840 },
      { ticker: "ICT", price: 887.6114, volume: 186_930, value: 165_921_199 },
      { ticker: "GLO", price: 1918.0909, volume: 40_000, value: 76_723_636 },
    ]);
  });

  it("returns [] when the BLOCK SALES section has no rows (valid no-trades day)", () => {
    const items = REAL_LAYOUT_ITEMS.filter(
      (it) => !["SEVN", "ICT", "GLO"].some((ticker) => it.str.startsWith(ticker))
    );
    expect(tryParsePage(items)).toEqual([]);
  });

  it("returns null when the BLOCK SALES label is missing", () => {
    const items = REAL_LAYOUT_ITEMS.filter((it) => it.str !== "BLOCK SALES");
    expect(tryParsePage(items)).toBeNull();
  });

  it("returns null when no SECURITY header row follows the label", () => {
    const items = REAL_LAYOUT_ITEMS.filter((it) => it.str !== "SECURITY");
    expect(tryParsePage(items)).toBeNull();
  });

  it("returns null for an unrelated page with no matching structure", () => {
    expect(tryParsePage([{ str: "Weekly Top Price Gainers", x: 10, y: 10 }])).toBeNull();
  });
});
