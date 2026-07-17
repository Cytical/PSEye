import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { IndexForeignFlow } from "@pseye/source-foreign-flow";

export interface TextItem {
  str: string;
  x: number;
  y: number;
}

const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

/** Row items are matched by y-coordinate; PDF text runs land within ~1pt of each other in the same row, never further, in the samples this was built against. */
const ROW_EPSILON = 1.5;

/**
 * Parses PSE's free weekly "Market Watch" PDF (linked from
 * pse.com.ph/market-report/, e.g. ".../wk28_jul2026mktwatch.pdf") for the
 * index-level foreign buying/selling figures in its "Weekly Market
 * Statistics" table — position-based extraction (group text runs into rows
 * by y-coordinate, order into columns by x-coordinate), since this table's
 * raw text stream order interleaves with footer/disclaimer text rather than
 * reading row-by-row. Verified against a live report at build time; returns
 * null (never throws, never guesses) if the expected labels/columns aren't
 * found, since a wrong number here is worse than no number.
 *
 * Only the current (rightmost/most recent) week's column is extracted — the
 * PDF also has a prior-week column, but inferring its year when the report
 * spans a calendar year boundary is an edge case not worth the complexity
 * when this runs weekly anyway and the DB accumulates real history over
 * time. See docs/PLANNING.md and this package's doc comments for the
 * broader legal/scope context (same free-report tradeoff as the PDF itself
 * already accepts — figures only, never re-hosting the document).
 *
 * Lives in etl/ (not packages/sources/foreign-flow) so apps/web never
 * transitively imports pdfjs-dist — it isn't tree-shakeable away once
 * re-exported through a shared barrel, since pdf.js runs real module-init
 * side effects (a DOMMatrix polyfill check) that broke static generation
 * for every page when this was briefly in the shared package.
 */
export async function parseMarketWatchPdf(pdfBytes: Uint8Array): Promise<IndexForeignFlow | null> {
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

  return null;
}

export function tryParsePage(items: TextItem[]): IndexForeignFlow | null {
  const weekRangePattern = /^\w{3}\s+\d{1,2}\s*-\s*\w{3}\s+\d{1,2}$/;
  const weekHeaders = items.filter((it) => weekRangePattern.test(it.str));
  const ytdHeader = items.find((it) => it.str === "Year-to-Date");
  if (weekHeaders.length < 2 || !ytdHeader) return null;

  // Current week = rightmost week-range header (columns run oldest-to-newest, left-to-right).
  const sorted = [...weekHeaders].sort((a, b) => a.x - b.x);
  const currentWeekHeader = sorted[sorted.length - 1];
  const priorNeighbor = sorted[sorted.length - 2];

  const columnMin = (currentWeekHeader.x + priorNeighbor.x) / 2;
  const columnMax = (currentWeekHeader.x + ytdHeader.x) / 2;

  // The page corner banner ("Jul 06 - Jul 10, 2026") carries the year the bare
  // column header ("Jul 06 - Jul 10") lacks.
  const bannerMatch = items
    .map((it) => it.str.match(/^\w{3}\s+\d{1,2}\s*-\s*(\w{3})\s+(\d{1,2}),\s*(\d{4})$/))
    .find((m): m is RegExpMatchArray => m !== null);
  if (!bannerMatch) return null;

  const periodEnd = toIsoDate(bannerMatch[1], bannerMatch[2], bannerMatch[3]);
  if (!periodEnd) return null;

  const foreignBuyLabel = items.find((it) => it.str === "Foreign Buying");
  const foreignSellLabel = items.find((it) => it.str === "Foreign Selling");
  if (!foreignBuyLabel || !foreignSellLabel) return null;

  const foreignBuyValue = valueInRow(items, foreignBuyLabel.y, columnMin, columnMax);
  const foreignSellValue = valueInRow(items, foreignSellLabel.y, columnMin, columnMax);
  if (foreignBuyValue === null || foreignSellValue === null) return null;

  return {
    periodEnd,
    foreignBuyValue,
    foreignSellValue,
    // Rounded to the centavo PSE itself reports to — floating-point
    // subtraction of two centavo-precision values otherwise leaves noise
    // (e.g. 3622288376.0500001) that isn't in the source data.
    netValue: Math.round((foreignBuyValue - foreignSellValue) * 100) / 100,
  };
}

function valueInRow(items: TextItem[], labelY: number, columnMin: number, columnMax: number): number | null {
  const candidate = items.find(
    (it) => Math.abs(it.y - labelY) <= ROW_EPSILON && it.x > columnMin && it.x < columnMax
  );
  if (!candidate) return null;
  return parsePesoNumber(candidate.str);
}

/** "18,263,956,192.43" or "(9,903,714.18)" (parens = negative) -> a number. */
function parsePesoNumber(raw: string): number | null {
  const trimmed = raw.trim();
  const negative = trimmed.startsWith("(") && trimmed.endsWith(")");
  const cleaned = trimmed.replace(/[(),]/g, "");
  const n = Number(cleaned);
  if (!Number.isFinite(n)) return null;
  return negative ? -n : n;
}

function toIsoDate(monthAbbr: string, day: string, year: string): string | null {
  const month = MONTHS[monthAbbr];
  if (month === undefined) return null;
  const d = new Date(Date.UTC(Number(year), month, Number(day)));
  return d.toISOString().slice(0, 10);
}
