import { describe, expect, it } from "vitest";
import { tryParsePage, extractForeignFlowRowsFromPage, type TextItem } from "./parseQuotationReportPdf";

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

/**
 * Coordinates mirror a real Daily Quotation Report PDF's page 1 (verified
 * live, July 17, 2026 issue) — the per-stock MAIN BOARD table under the
 * "F I N A N C I A L S" / "**** BANKS ****" headers, ending with the Net
 * Foreign Buying/(Selling), PHP column as the rightmost item per row.
 */
const FOREIGN_FLOW_PAGE_ITEMS: TextItem[] = [
  { str: "Net Foreign", x: 535, y: 651 },
  { str: "Symbol", x: 113, y: 645 },
  { str: "Bid", x: 167, y: 645 },
  { str: "Ask", x: 205, y: 644 },
  { str: "Open", x: 238, y: 644 },
  { str: "High", x: 275, y: 645 },
  { str: "Low", x: 313, y: 645 },
  { str: "Close", x: 346, y: 645 },
  { str: "Volume", x: 422, y: 644 },
  { str: "Value, P", x: 481, y: 644 },
  { str: "HP", x: 504, y: 644 },
  { str: "Issue Name", x: 36, y: 644 },
  { str: "Buying", x: 529, y: 644 },
  { str: "/", x: 549, y: 644 },
  { str: "(Selling),", x: 551, y: 644 },
  { str: "P", x: 546, y: 637 },
  { str: "HP", x: 550, y: 637 },
  { str: "F I N A N C I A L S", x: 267, y: 604 },
  { str: "**** BANKS ****", x: 36, y: 593 },
  { str: "ASIA UNITED", x: 36, y: 571 },
  { str: "AUB", x: 117, y: 571 },
  { str: "50.4", x: 167, y: 571 },
  { str: "50.6", x: 203, y: 571 },
  { str: "50.8", x: 239, y: 571 },
  { str: "50.8", x: 275, y: 571 },
  { str: "50.4", x: 311, y: 571 },
  { str: "50.6", x: 347, y: 571 },
  { str: "9,670", x: 424, y: 571 },
  { str: "488,995.5", x: 478, y: 571 },
  { str: "2,023.5", x: 553, y: 571 },
  { str: "BDO UNIBANK", x: 36, y: 560 },
  { str: "BDO", x: 117, y: 560 },
  { str: "126.9", x: 163, y: 560 },
  { str: "127", x: 204, y: 560 },
  { str: "126.3", x: 235, y: 560 },
  { str: "128.1", x: 271, y: 560 },
  { str: "125", x: 313, y: 560 },
  { str: "127", x: 349, y: 560 },
  { str: "2,304,590", x: 410, y: 560 },
  { str: "292,667,515", x: 470, y: 560 },
  { str: "100,959,149", x: 538, y: 560 },
  { str: "BANK COMMERCE", x: 36, y: 549 },
  { str: "BNCOM", x: 117, y: 549 },
  { str: "10.36", x: 163, y: 549 },
  { str: "10.48", x: 199, y: 549 },
  { str: "10.5", x: 239, y: 549 },
  { str: "10.8", x: 275, y: 549 },
  { str: "10.38", x: 307, y: 549 },
  { str: "10.48", x: 343, y: 549 },
  { str: "94,100", x: 420, y: 549 },
  { str: "986,052", x: 484, y: 549 },
  { str: "-", x: 574, y: 549 },
  { str: "METROBANK", x: 36, y: 527 },
  { str: "MBT", x: 117, y: 527 },
  { str: "56.25", x: 163, y: 527 },
  { str: "56.75", x: 199, y: 527 },
  { str: "56.65", x: 235, y: 527 },
  { str: "56.85", x: 271, y: 527 },
  { str: "56.25", x: 307, y: 527 },
  { str: "56.25", x: 343, y: 527 },
  { str: "132,830", x: 416, y: 527 },
  { str: "7,506,698.5", x: 472, y: 527 },
  { str: "(23,040,571.5)", x: 538, y: 527 },
  { str: "FINANCIALS SECTOR TOTAL", x: 36, y: 500 },
];

describe("extractForeignFlowRowsFromPage", () => {
  it("extracts ticker + net foreign buying/(selling) for every stock row, ignoring headers/sector labels/totals", () => {
    expect(extractForeignFlowRowsFromPage(FOREIGN_FLOW_PAGE_ITEMS, new Set())).toEqual([
      { ticker: "AUB", netForeignValue: 2023.5 },
      { ticker: "BDO", netForeignValue: 100_959_149 },
      { ticker: "BNCOM", netForeignValue: 0 },
      { ticker: "MBT", netForeignValue: -23_040_571.5 },
    ]);
  });

  it("skips a ticker already in the shared seen set (page-break dedup)", () => {
    const seen = new Set(["BDO"]);
    const rows = extractForeignFlowRowsFromPage(FOREIGN_FLOW_PAGE_ITEMS, seen);
    expect(rows.some((r) => r.ticker === "BDO")).toBe(false);
  });

  it("returns [] for a page with no stock rows", () => {
    expect(extractForeignFlowRowsFromPage([{ str: "SECTOR TOTAL", x: 36, y: 500 }], new Set())).toEqual([]);
  });
});
