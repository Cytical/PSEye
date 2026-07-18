import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";

export interface TextItem {
  str: string;
  x: number;
  y: number;
}

export interface BlockSaleRow {
  ticker: string;
  price: number;
  volume: number;
  value: number;
}

/** Row items are matched by y-coordinate; PDF text runs land within ~1pt of each other in the same row, never further, in the samples this was built against (same tolerance as parseMarketWatchPdf.ts). */
const ROW_EPSILON = 1.5;

/**
 * Parses PSE's free daily "Daily Quotation Report" (linked from
 * pse.com.ph/market-report/'s "End of Day Quotes" list, e.g.
 * ".../market_report/June 30, 2026-EOD.pdf") for its "BLOCK SALES" table —
 * large negotiated trades ("crosses") executed outside the continuous order
 * book. Same position-based extraction approach as parseMarketWatchPdf.ts
 * (group text runs into rows by y-coordinate, order into columns by
 * x-coordinate) since the table sits between two near-identical header rows
 * (PHP-denominated block sales, then a USD-denominated variant) rather than
 * being delimited by anything a plain regex could key off.
 *
 * Only the PHP-denominated table is extracted — `BlockSale` (see
 * packages/sources/block-sales/src/types.ts) has no currency field, and
 * USD-denominated block sales are rare/edge-case. Returns [] (never throws,
 * never guesses) if the BLOCK SALES section isn't found on any page, or if
 * it's found but empty (a genuine no-block-sales-today reading) — both are
 * valid, distinguishable by the caller only in that both yield no rows.
 *
 * Lives in etl/ (not packages/sources/block-sales), matching this project's
 * documented rule for any *Source needing pdfjs-dist: putting PDF-parsing
 * code in a shared packages/sources/* barrel that apps/web imports broke
 * static generation for every route (pdf.js's DOMMatrix polyfill check isn't
 * tree-shakeable once re-exported) — see parseMarketWatchPdf.ts's own doc
 * comment and CLAUDE.md for the full story.
 */
export async function parseQuotationReportPdf(pdfBytes: Uint8Array): Promise<BlockSaleRow[]> {
  const doc = await getDocument({ data: pdfBytes }).promise;

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const items: TextItem[] = content.items
      .map((it) => {
        const raw = it as { str?: string; transform?: number[] };
        return { str: raw.str ?? "", x: raw.transform?.[4] ?? 0, y: raw.transform?.[5] ?? 0 };
      })
      .filter((it) => it.str.trim() !== "");

    const result = tryParsePage(items);
    if (result) return result;
  }

  return [];
}

export function tryParsePage(items: TextItem[]): BlockSaleRow[] | null {
  const sectionLabel = items.find((it) => it.str === "BLOCK SALES");
  if (!sectionLabel) return null;

  // The PHP table's header ("SECURITY"/"PRICE, Php"/"VOLUME"/"VALUE, Php") is
  // the nearest "SECURITY" row below the section label; a second "SECURITY"
  // row (the USD-denominated table's header, present even when empty) bounds
  // where PHP rows stop.
  const securityHeaders = items
    .filter((it) => it.str === "SECURITY" && it.y < sectionLabel.y)
    .sort((a, b) => b.y - a.y);
  if (securityHeaders.length === 0) return null;

  const headerY = securityHeaders[0].y;
  const nextHeaderY = securityHeaders[1]?.y ?? -Infinity;

  const headerRow = items.filter((it) => Math.abs(it.y - headerY) <= ROW_EPSILON);
  const securityHeader = headerRow.find((it) => it.str === "SECURITY");
  const priceHeader = headerRow.find((it) => it.str.startsWith("PRICE"));
  const volumeHeader = headerRow.find((it) => it.str === "VOLUME");
  const valueHeader = headerRow.find((it) => it.str.startsWith("VALUE"));
  if (!securityHeader || !priceHeader || !volumeHeader || !valueHeader) return null;

  const securityColMax = (securityHeader.x + priceHeader.x) / 2;
  const priceColMax = (priceHeader.x + volumeHeader.x) / 2;
  const volumeColMax = (volumeHeader.x + valueHeader.x) / 2;

  const rowYs = [
    ...new Set(
      items
        .filter((it) => it.y < headerY - ROW_EPSILON && it.y > nextHeaderY + ROW_EPSILON)
        .map((it) => it.y)
    ),
  ];

  const rows: BlockSaleRow[] = [];
  for (const y of rowYs) {
    const rowItems = items.filter((it) => Math.abs(it.y - y) <= ROW_EPSILON);
    const ticker = rowItems.find((it) => it.x < securityColMax)?.str;
    const priceStr = rowItems.find((it) => it.x >= securityColMax && it.x < priceColMax)?.str;
    const volumeStr = rowItems.find((it) => it.x >= priceColMax && it.x < volumeColMax)?.str;
    const valueStr = rowItems.find((it) => it.x >= volumeColMax)?.str;
    if (!ticker || !priceStr || !volumeStr || !valueStr) continue;
    if (!/^[A-Z][A-Z0-9]*$/.test(ticker)) continue;

    const price = parsePesoNumber(priceStr);
    const volume = parsePesoNumber(volumeStr);
    const value = parsePesoNumber(valueStr);
    if (price === null || volume === null || value === null) continue;

    rows.push({ ticker, price, volume: Math.round(volume), value: Math.round(value) });
  }

  return rows;
}

/** "1,448,400.00" -> 1448400; PSE's block sale figures are never negative, so no paren handling needed (unlike parseMarketWatchPdf's foreign-flow net values). */
function parsePesoNumber(raw: string): number | null {
  const n = Number(raw.trim().replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

export interface StockForeignFlowRow {
  ticker: string;
  netForeignValue: number; // PHP; positive = net buying, negative = net selling, 0 = none traded
}

/**
 * The report's ticker column, verified live (July 2026 issue) at x≈113-120
 * across every MAIN BOARD page — comfortably between the Issue Name column
 * (x=36, e.g. "ASIA UNITED") and the Bid column (x≈163+), so a plain x-range
 * gate distinguishes the ticker from both without needing to parse headers.
 */
const TICKER_COL_MIN = 100;
const TICKER_COL_MAX = 160;

/**
 * Parses per-stock daily "Net Foreign Buying/(Selling), PHP" from the same
 * Daily Quotation Report used for BLOCK SALES (see parseQuotationReportPdf's
 * doc comment) — a real, free, per-stock daily figure that turns out to sit
 * right in a report this project already fetches for block sales, discovered
 * 2026-07 while re-investigating whether per-stock foreign flow (previously
 * only found gated behind PSE's paid Monthly Report) had a free alternative.
 *
 * Every MAIN BOARD page (1 through the page before "BLOCK SALES") lists one
 * row per stock: Issue Name, Symbol, Bid, Ask, Open, High, Low, Close,
 * Volume, Value(PHP), Net Foreign Buying/(Selling)(PHP) — sector-grouped
 * under spaced-letter headers ("F I N A N C I A L S"), sub-headers
 * ("**** BANKS ****"), and "<SECTOR> SECTOR TOTAL" footers. Rather than
 * parse the column header (it's a 3-line-tall label split across "Net
 * Foreign" / "Buying / (Selling)," / "PHP" at three different y-coordinates),
 * a stock row is identified structurally: a ticker-shaped item in the ticker
 * column's x-range, on a row with enough columns to be real data (not a
 * sector/total label, which has no ticker at all). The Net Foreign value is
 * always the rightmost item on that row, since it's the last column.
 *
 * Negative (net selling) values are parenthesized like
 * parseMarketWatchPdf.ts's index-level figures ("(23,040,571.5)"); "-" means
 * no foreign trading that day, parsed as 0, not skipped — a real reading,
 * not a missing one.
 */
export async function parseQuotationReportForeignFlow(pdfBytes: Uint8Array): Promise<StockForeignFlowRow[]> {
  const doc = await getDocument({ data: pdfBytes }).promise;
  const rows: StockForeignFlowRow[] = [];
  const seen = new Set<string>();

  for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
    const page = await doc.getPage(pageNum);
    const content = await page.getTextContent();
    const items: TextItem[] = content.items
      .map((it) => {
        const raw = it as { str?: string; transform?: number[] };
        return { str: raw.str ?? "", x: raw.transform?.[4] ?? 0, y: raw.transform?.[5] ?? 0 };
      })
      .filter((it) => it.str.trim() !== "");

    // BLOCK SALES / SECTORAL SUMMARY page (and everything after it) isn't a
    // per-stock table — stop before it rather than risk misreading it as one.
    if (items.some((it) => it.str === "BLOCK SALES")) break;

    for (const row of extractForeignFlowRowsFromPage(items, seen)) {
      rows.push(row);
    }
  }

  return rows;
}

/** One page's worth of per-stock foreign flow extraction, factored out of parseQuotationReportForeignFlow so it's testable without a real PDF (same reasoning as tryParsePage for BLOCK SALES). `seen` is shared and mutated across pages to guard against a ticker appearing twice (e.g. a page-break artifact). */
export function extractForeignFlowRowsFromPage(items: TextItem[], seen: Set<string>): StockForeignFlowRow[] {
  const rows: StockForeignFlowRow[] = [];
  for (const row of groupRowsByY(items)) {
    const tickerItem = row.find(
      (it) => it.x >= TICKER_COL_MIN && it.x <= TICKER_COL_MAX && /^[A-Z][A-Z0-9]*$/.test(it.str)
    );
    if (!tickerItem || seen.has(tickerItem.str) || row.length < 6) continue;

    const rightmost = row.reduce((a, b) => (b.x > a.x ? b : a));
    const netForeignValue = parseSignedPesoNumber(rightmost.str);
    if (netForeignValue === null) continue;

    seen.add(tickerItem.str);
    rows.push({ ticker: tickerItem.str, netForeignValue });
  }
  return rows;
}

/** Groups text runs into table rows by y-coordinate (same tolerance as BLOCK SALES row grouping), each row sorted left-to-right by x. */
function groupRowsByY(items: TextItem[], epsilon = 1.5): TextItem[][] {
  const ys = [...new Set(items.map((it) => it.y))].sort((a, b) => b - a);
  const used = new Set<number>();
  const rows: TextItem[][] = [];
  for (const y of ys) {
    if (used.has(y)) continue;
    const clustered = ys.filter((y2) => !used.has(y2) && Math.abs(y2 - y) <= epsilon);
    clustered.forEach((y2) => used.add(y2));
    rows.push(items.filter((it) => clustered.includes(it.y)).sort((a, b) => a.x - b.x));
  }
  return rows;
}

/** "18,263,956,192.43" or "(9,903,714.18)" (parens = negative) or "-" (none) -> a number. */
function parseSignedPesoNumber(raw: string): number | null {
  const trimmed = raw.trim();
  if (trimmed === "-" || trimmed === "") return 0;
  const negative = trimmed.startsWith("(") && trimmed.endsWith(")");
  const cleaned = trimmed.replace(/[(),]/g, "");
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}
