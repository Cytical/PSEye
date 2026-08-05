import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";

export interface ParsedCompanyInfo {
  /** null when the page has no "Company Description" table at all. */
  description: string | null;
  /** The filing PSE Edge attributes the description to (e.g. "SEC Form 17-A (2024)"), if it says. */
  citedSource: string | null;
  /** Everything below comes from the same page's "Security Information" and
   * "Contact Information" tables — a company missing one field (or the whole
   * table) just gets null for it, same fallback contract as description. */
  incorporationDate: string | null;
  /** A headcount, not names — PSE Edge doesn't publish director names (see
   * backfill-company-profiles.ts's doc comment on why board members aren't
   * available from any free source). */
  numberOfDirectors: number | null;
  externalAuditor: string | null;
  /** e.g. "12/31 (Month/Day)", kept as PSE Edge phrases it rather than parsed
   * into a month/day pair — every value seen is exactly this shape, not worth
   * a stricter type for a field that's purely informational on the page. */
  fiscalYearEnd: string | null;
  businessAddress: string | null;
  website: string | null;
  /** Absolute URL of the company's own logo image, e.g.
   * "https://edge.pse.com.ph/clogo/bdoLOGO1.jpg" — PSE Edge serves these from
   * a `<img alt="Logo">` in the page header, filename scheme varies per
   * company (some are `/clogo/{cmpy_id}/cl{hash}.{ext}`, older ones are
   * `/clogo/{something}.{ext}` directly), so it's read off the page rather
   * than constructed from ticker/cmpy_id. Null when a company has none on
   * file (the `<img>` itself is still present but empty `src`, or absent). */
  logoUrl: string | null;
}

/**
 * Parses a "label -> value" table (`<tr><th>label</th><td>value</td></tr>`
 * rows) by its `<caption>` text. Used for "Security Information" and
 * "Contact Information", which are both this shape on a PSE Edge company info
 * page — unlike "Company Description", which is one td of prose, not rows.
 */
function parseKeyValueTable($: CheerioAPI, captionText: string): Record<string, string> {
  const caption = $("table.view caption").filter((_, el) => $(el).text().trim() === captionText).first();
  if (caption.length === 0) return {};

  const values: Record<string, string> = {};
  caption
    .closest("table")
    .find("tr")
    .each((_, row) => {
      const label = $(row).find("th").first().text().trim();
      // Collapses the odd embedded newlines PSE Edge's markup has for
      // multi-line values (Fiscal Year's "(Month/Day)" suffix, a business
      // address with a separate "Principal Address" line) into single spaces
      // — that raw whitespace is a source-formatting artifact, not meaningful
      // line breaks worth preserving in a one-line profile field.
      const value = $(row).find("td").first().text().replace(/\s+/g, " ").trim();
      if (label && value) values[label] = value;
    });
  return values;
}

/**
 * Parses the "Company Description", "Security Information", and "Contact
 * Information" tables from a PSE Edge company info page
 * (`/companyInformation/form.do?cmpy_id=...`). The description renders as a
 * single `<table class="view"><caption>Company Description</caption>`
 * followed by one `<td>` whose paragraphs are joined with `<br/><br/>` rather
 * than separate block elements, and often ends with a "Source: ..." line
 * naming the SEC filing it was drawn from — split out here so callers can
 * cite it separately instead of showing it as a stray final sentence. The
 * other two tables are plain label/value rows, parsed by parseKeyValueTable.
 */
export function parseCompanyInfoHtml(html: string): ParsedCompanyInfo {
  const $ = cheerio.load(html);

  const security = parseKeyValueTable($, "Security Information");
  const contact = parseKeyValueTable($, "Contact Information");
  const directorCount = security["Number of Directors"] ? parseInt(security["Number of Directors"], 10) : NaN;

  const logoSrc = $("img[alt='Logo']").first().attr("src");
  const logoUrl = logoSrc ? new URL(logoSrc, "https://edge.pse.com.ph").toString() : null;

  const base: Omit<ParsedCompanyInfo, "description" | "citedSource"> = {
    incorporationDate: security["Incorporation Date"] || null,
    numberOfDirectors: Number.isFinite(directorCount) ? directorCount : null,
    externalAuditor: security["External Auditor"] || null,
    fiscalYearEnd: security["Fiscal Year"] || null,
    businessAddress: contact["Business Address"] || null,
    website: contact["Website"] || null,
    logoUrl,
  };

  const caption = $("table.view caption").filter((_, el) => $(el).text().trim() === "Company Description").first();
  if (caption.length === 0) return { description: null, citedSource: null, ...base };

  const cell = caption.closest("table").find("td").first();
  cell.find("br").replaceWith("\n");

  const paragraphs = cell
    .text()
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const sourceIndex = paragraphs.findIndex((line) => /^Source:/i.test(line));
  const citedSource = sourceIndex >= 0 ? paragraphs[sourceIndex].replace(/^Source:\s*/i, "").trim() : null;
  const descriptionParagraphs = sourceIndex >= 0 ? paragraphs.slice(0, sourceIndex) : paragraphs;

  return {
    description: descriptionParagraphs.length > 0 ? descriptionParagraphs.join("\n\n") : null,
    citedSource: citedSource || null,
    ...base,
  };
}
