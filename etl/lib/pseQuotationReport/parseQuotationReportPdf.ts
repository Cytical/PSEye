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
