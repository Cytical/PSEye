import * as cheerio from "cheerio";

export interface ParsedCompanyInfo {
  /** null when the page has no "Company Description" table at all. */
  description: string | null;
  /** The filing PSE Edge attributes the description to (e.g. "SEC Form 17-A (2024)"), if it says. */
  citedSource: string | null;
}

/**
 * Parses the "Company Description" table from a PSE Edge company info page
 * (`/companyInformation/form.do?cmpy_id=...`). That page renders the
 * description as a single `<table class="view"><caption>Company Description</caption>`
 * followed by one `<td>` whose paragraphs are joined with `<br/><br/>` rather
 * than separate block elements, and often ends with a "Source: ..." line
 * naming the SEC filing it was drawn from — split out here so callers can
 * cite it separately instead of showing it as a stray final sentence.
 */
export function parseCompanyInfoHtml(html: string): ParsedCompanyInfo {
  const $ = cheerio.load(html);

  const caption = $("table.view caption").filter((_, el) => $(el).text().trim() === "Company Description").first();
  if (caption.length === 0) return { description: null, citedSource: null };

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
  };
}
