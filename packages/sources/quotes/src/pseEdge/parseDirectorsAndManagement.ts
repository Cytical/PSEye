import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";

export interface CompanyPerson {
  position: string;
  name: string;
}

export interface ParsedDirectorsAndManagement {
  boardOfDirectors: CompanyPerson[];
  managementOfficers: CompanyPerson[];
}

/**
 * Parses a "position -> name" list table by its `<caption>` text — the Board
 * of Directors and Management Officers tables on a PSE Edge "Directors and
 * Management" page (`/companyPage/directors_and_management_list.do`) share
 * this shape (`<table class="list"><caption>...</caption><tbody><tr><td>
 * position</td><td>name</td></tr>...`). PSE Edge's own markup leaves stray
 * trailing whitespace on some cells (e.g. "Treasurer ", "Alma F. Buntua  "),
 * hence the trim on both columns.
 */
function parsePersonTable($: CheerioAPI, captionText: string): CompanyPerson[] {
  const caption = $("table.list caption")
    .filter((_, el) => $(el).text().trim() === captionText)
    .first();
  if (caption.length === 0) return [];

  const people: CompanyPerson[] = [];
  caption
    .closest("table")
    .find("tbody tr")
    .each((_, row) => {
      const cells = $(row).find("td");
      const position = $(cells[0]).text().trim();
      const name = $(cells[1]).text().trim();
      if (position && name) people.push({ position, name });
    });
  return people;
}

/**
 * Parses the Board of Directors and Management Officers tables from a PSE
 * Edge "Directors and Management" page. Unlike the Stock Data tab's
 * always-empty P/E/Book Value fields (a confirmed dead end, see
 * backfill-company-profiles.ts's history), this is a genuinely separate,
 * populated endpoint — verified live across a large cap (BDO), a thin
 * SME-board name (PTC), and a small/loss-making one (MRC), all with full
 * rosters. Returns empty arrays (not null) when a company has no data on
 * file — same "omit rather than fabricate" contract as the rest of this
 * page's optional fields, but there's no single "page has nothing at all"
 * marker to gate on the way parseFinancialReportsHtml gates on the "Annual"
 * heading, so callers should treat "both arrays empty" as the missing case.
 */
export function parseDirectorsAndManagementHtml(html: string): ParsedDirectorsAndManagement {
  const $ = cheerio.load(html);

  return {
    boardOfDirectors: parsePersonTable($, "Board of Directors"),
    managementOfficers: parsePersonTable($, "Management Officers"),
  };
}
