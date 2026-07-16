import * as cheerio from "cheerio";
import { PSE_EDGE_COMPANIES } from "@pseye/source-quotes";
import type { Disclosure, DisclosureType } from "../types";

const CMPY_ID_TO_COMPANY = new Map(PSE_EDGE_COMPANIES.map((c) => [c.cmpyId, c] as const));

const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

/**
 * Best-effort mapping from PSE Edge's free-text "Template Name" (dozens of
 * distinct values — see the announcements page's own filter dropdown for the
 * full list) onto our fixed, beginner-facing DisclosureType taxonomy.
 * Substring match, most-specific first; anything unmatched is "other" rather
 * than mis-filed under a category it doesn't belong to.
 */
export function classifyTemplate(templateName: string): DisclosureType {
  const t = templateName.toLowerCase();
  if (t.includes("shareholdings") || t.includes("beneficial ownership")) return "insider_trading_report";
  if (t.includes("public ownership")) return "public_ownership_report";
  if (t.includes("sec form") || t.includes("articles of incorporation") || t.includes("by-laws")) {
    return "sec_filing";
  }
  if (t.includes("analyst") || t.includes("investors' briefing") || t.includes("investors briefing")) {
    return "analyst_briefing";
  }
  if (
    t.includes("material information") ||
    t.includes("clarification of news") ||
    t.includes("cash dividend") ||
    t.includes("buy-back") ||
    t.includes("acquisition or disposition")
  ) {
    return "material_information";
  }
  return "other";
}

/** "Jul 16, 2026 05:33 PM" (PSE Edge's own Asia/Manila wall-clock, no offset) -> UTC ISO instant. */
export function parseAnnounceDateToUtcIso(raw: string): string | null {
  const m = raw.trim().match(/^(\w{3})\s+(\d{1,2}),\s+(\d{4})\s+(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  const month = MONTHS[m[1]];
  if (month === undefined) return null;

  const day = Number(m[2]);
  const year = Number(m[3]);
  let hour = Number(m[4]) % 12;
  if (m[6].toUpperCase() === "PM") hour += 12;
  const minute = Number(m[5]);

  // PH has no DST and is a fixed UTC+8 year-round, so the wall-clock reading
  // is always exactly 8 hours ahead of the UTC instant it names.
  const utcMs = Date.UTC(year, month, day, hour, minute) - 8 * 60 * 60 * 1000;
  return new Date(utcMs).toISOString();
}

/**
 * Parses one page of `/announcements/search.ax`'s response — the same HTML
 * fragment the site's own jQuery `searchList()` drops into `#dataList`
 * (see epCommon.js). Rows are matched to our tracked roster by `cmpy_id`
 * pulled from the company name's own link href, not by name-text matching
 * (PSE Edge's name strings occasionally differ in punctuation/casing from
 * ours) — rows for untracked companies are silently dropped.
 */
export function parseAnnouncementsHtml(html: string): Disclosure[] {
  const $ = cheerio.load(html);
  const out: Disclosure[] = [];

  $("table.list tbody tr").each((_, tr) => {
    const cells = $(tr).find("td");
    if (cells.length < 5) return;

    const href = $(cells[0]).find("a").attr("href") ?? "";
    const cmpyId = href.match(/cmpy_id=(\d+)/)?.[1];
    const company = cmpyId ? CMPY_ID_TO_COMPANY.get(cmpyId) : undefined;
    if (!company) return;

    const templateName = $(cells[1]).text().trim();
    const filedAt = parseAnnounceDateToUtcIso($(cells[3]).text());
    const referenceNo = $(cells[4]).text().trim();
    if (!templateName || !filedAt || !referenceNo) return;

    out.push({
      ticker: company.ticker,
      companyName: company.companyName,
      type: classifyTemplate(templateName),
      headline: templateName,
      filedAt,
      referenceNo,
    });
  });

  return out;
}

/** "[3 / 11]" -> 11. Returns null if the page (or count block) is missing/malformed. */
export function parseTotalPages(html: string): number | null {
  const m = html.match(/\[\s*\d+\s*\/\s*(\d+)\s*\]/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}
