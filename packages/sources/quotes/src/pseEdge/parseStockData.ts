import * as cheerio from "cheerio";

export interface ParsedStockData {
  /** null when PSE Edge has no trade to report (suspended ticker, no fill yet today, etc). */
  price: number | null;
  pctChange: number | null;
  marketCap: number | null;
}

const NBSP = " ";

/**
 * Parses the "Stock Data" table from a PSE Edge company page
 * (`/companyPage/stockData.do?cmpy_id=...`). That page renders two adjacent
 * `<table class="view">` blocks as a flat run of `<th>label</th><td>value</td>`
 * pairs per row (no nesting), so pairing every `<th>` with its immediate `<td>`
 * sibling captures both tables' fields regardless of which one a field lives in.
 *
 * PSE Edge leaves the price/change cells blank (not zero) for a suspended
 * security or one with no trade yet today — that blank is the "N/A" signal
 * callers should render, not a false 0.00/flat reading.
 */
export function parseStockDataHtml(html: string): ParsedStockData {
  const $ = cheerio.load(html);
  const fields = new Map<string, string>();

  $("table.view th").each((_, th) => {
    const label = $(th).text().trim();
    const valueCell = $(th).next("td");
    const value = normalizeWhitespace(valueCell.text());
    fields.set(label, value);
  });

  const price = parseNumber(fields.get("Last Traded Price") ?? "");
  const marketCap = parseNumber(fields.get("Market Capitalization") ?? "");

  // No trade today (or suspended) means there's nothing to report a change
  // against, regardless of whatever partial text PSE Edge left in that cell.
  const pctChange = price === null ? null : parseSignedPctChange(fields.get("Change(% Change)") ?? "");

  return { price, pctChange, marketCap };
}

function normalizeWhitespace(raw: string): string {
  return raw.split(NBSP).join(" ").replace(/\s+/g, " ").trim();
}

function parseNumber(raw: string): number | null {
  const cleaned = raw.replace(/,/g, "").trim();
  if (cleaned === "") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

/** Parses PSE Edge's "up 2.40 (1.94%)" / "down 0.24 (1.75%)" format into a signed percent. */
function parseSignedPctChange(raw: string): number | null {
  const match = raw.match(/(up|down)[\s\S]*?\(([\d.]+)%\)/i);
  if (!match) return null;
  const magnitude = Number(match[2]);
  if (!Number.isFinite(magnitude)) return null;
  return match[1].toLowerCase() === "down" ? -magnitude : magnitude;
}
