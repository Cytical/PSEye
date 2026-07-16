import * as cheerio from "cheerio";
import type { Cheerio } from "cheerio";

export interface ParsedIndexSummary {
  value: number;
  change: number;
  pctChange: number;
}

/**
 * Parses the "Index Summary" widget on PSE Edge's homepage (edge.pse.com.ph),
 * pulling out one named index row (PSEi by default). PSE Edge doesn't put a
 * sign in the cell text — up/down is encoded as `style="color:green"` /
 * `style="color:red"` on the Chg/%Chg cells, and %Chg has a trailing ▲/▼
 * glyph — so both are stripped/derived here rather than left to the caller.
 */
export function parseIndexSummaryHtml(html: string, indexLabel = "PSEi"): ParsedIndexSummary | null {
  const $ = cheerio.load(html);
  let result: ParsedIndexSummary | null = null;

  $(".index table tbody tr").each((_, tr) => {
    const cells = $(tr).find("td");
    const label = $(cells[0]).text().trim();
    if (label !== indexLabel) return;

    const value = parseNumber($(cells[1]).text());
    const change = signedMagnitude($(cells[2]));
    const pctChange = signedMagnitude($(cells[3]));
    if (value === null || change === null || pctChange === null) return;

    result = { value, change, pctChange };
  });

  return result;
}

function parseNumber(raw: string): number | null {
  const cleaned = raw.replace(/,/g, "").trim();
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function signedMagnitude(cell: Cheerio<any>): number | null {
  const cleaned = cell.text().replace(/[▲▼]/g, "");
  const magnitude = parseNumber(cleaned);
  if (magnitude === null) return null;
  const isDown = (cell.attr("style") ?? "").includes("red");
  return isDown ? -magnitude : magnitude;
}
