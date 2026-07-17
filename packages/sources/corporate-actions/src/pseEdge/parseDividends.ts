import * as cheerio from "cheerio";
import { PSE_EDGE_COMPANIES } from "@pseye/source-quotes";
import type { CorporateAction, CorporateActionType } from "../types";

const CMPY_ID_TO_COMPANY = new Map(PSE_EDGE_COMPANIES.map((c) => [c.cmpyId, c] as const));

const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

/** "Feb 08, 2027" / "Dec 2, 2026" (comma optional, day may or may not be zero-padded) -> "2027-02-08". */
export function parsePseEdgeDate(raw: string): string | null {
  const m = raw.trim().match(/^(\w{3})\s+(\d{1,2}),?\s+(\d{4})$/);
  if (!m) return null;
  const month = MONTHS[m[1]];
  if (month === undefined) return null;
  const day = Number(m[2]);
  const year = Number(m[3]);
  const d = new Date(Date.UTC(year, month, day));
  return d.toISOString().slice(0, 10);
}

function classifyDividendType(raw: string): CorporateActionType | null {
  const t = raw.trim().toLowerCase();
  if (t === "cash") return "cash_dividend";
  if (t === "stock") return "stock_dividend";
  if (t === "property") return "property_dividend";
  return null;
}

/**
 * Parses one page of `/disclosureData/dividends_and_rights_info_list.ax?DividendsOrRights=Dividends`
 * — the same fragment the Dividends and Rights page's own `searchList()` call
 * loads into `#dataList`. Rows are matched to our tracked roster by `cmpy_id`,
 * same convention as the disclosures/quotes parsers. A row is dropped (not
 * defaulted) when its dividend type or dates don't parse — PSE Edge leaves
 * "TBA" in unscheduled date cells, which isn't a date we can show.
 *
 * The "Type of Security" column (e.g. a specific preferred share series) is
 * folded into `details` rather than swapped in for `ticker`, since a
 * preferred-series dividend rate doesn't apply to the tracked common ticker
 * — the calendar entry is about the company, the detail text is honest about
 * which security actually pays it.
 */
export function parseDividendsHtml(html: string): CorporateAction[] {
  const $ = cheerio.load(html);
  const out: CorporateAction[] = [];

  $("table.list tbody tr").each((_, tr) => {
    const cells = $(tr).find("td");
    if (cells.length < 7) return;

    const href = $(cells[0]).find("a").attr("href") ?? "";
    const cmpyId = href.match(/cmpy_id=(\d+)/)?.[1];
    const company = cmpyId ? CMPY_ID_TO_COMPANY.get(cmpyId) : undefined;
    if (!company) return;

    const securityType = $(cells[1]).text().trim();
    const type = classifyDividendType($(cells[2]).text());
    if (!type) return;

    const rate = $(cells[3]).text().trim();
    const exDate = parsePseEdgeDate($(cells[4]).text());
    const recordDate = parsePseEdgeDate($(cells[5]).text());
    const paymentDate = parsePseEdgeDate($(cells[6]).text());
    if (!exDate || !recordDate) return;

    out.push({
      ticker: company.ticker,
      companyName: company.companyName,
      type,
      exDate,
      recordDate,
      paymentDate,
      details: securityType.toUpperCase() === "COMMON" ? rate : `${rate} (${securityType})`,
    });
  });

  return out;
}

/** "[1 / 11]" -> 11. */
export function parseTotalPages(html: string): number | null {
  const m = html.match(/\[\s*\d+\s*\/\s*(\d+)\s*\]/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}
