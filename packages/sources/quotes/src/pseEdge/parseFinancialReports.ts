import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";

export interface FinancialStatementFigure {
  current: number | null;
  previous: number | null;
}

const EMPTY_FIGURE: FinancialStatementFigure = { current: null, previous: null };

export interface ParsedAnnualFinancials {
  /** PSE Edge's own phrasing, e.g. "Dec 31, 2025" — kept as a string rather
   * than parsed into a Date, since every caller only needs to display it and
   * the source format ("Mon DD, YYYY") isn't ISO. */
  fiscalYearEnded: string | null;
  /** e.g. "PhP (in Millions)", "In Thousand Php", "PHP" — units vary per
   * company (large caps report pre-scaled to millions, smaller ones report
   * raw pesos), so this is shown alongside the figures rather than
   * normalized: silently rescaling risks misreading a number by 1000x. */
  currencyUnit: string | null;

  currentAssets: FinancialStatementFigure;
  totalAssets: FinancialStatementFigure;
  currentLiabilities: FinancialStatementFigure;
  totalLiabilities: FinancialStatementFigure;
  retainedEarnings: FinancialStatementFigure;
  stockholdersEquity: FinancialStatementFigure;
  stockholdersEquityParent: FinancialStatementFigure;
  bookValuePerShare: FinancialStatementFigure;

  grossRevenue: FinancialStatementFigure;
  grossExpense: FinancialStatementFigure;
  incomeBeforeTax: FinancialStatementFigure;
  netIncomeAfterTax: FinancialStatementFigure;
  netIncomeAttributableToParent: FinancialStatementFigure;
  earningsPerShareBasic: FinancialStatementFigure;
  earningsPerShareDiluted: FinancialStatementFigure;
}

/**
 * The period/currency lines below are read off `.html()` rather than `.text()`
 * (the <br> has to survive long enough to become a newline separator), which
 * means cheerio never decodes entities for us and a raw `&amp;` reaches the
 * DB. That string is displayed verbatim on the per-company page, so Manulife's
 * "CSM except EPS &amp; BV" rendered with the entity showing. Only the five
 * predefined XML entities plus &nbsp; are handled: PSE Edge's own escaping is
 * the source here and it emits nothing more exotic.
 */
function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0*39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&"); // last, so "&amp;lt;" decodes to "&lt;" and not "<"
}

/** "1,234,567" / "-1,234" / "0.06" -> number; "-" (PSE Edge's own
 * not-reported marker) or blank -> null. No parentheses-as-negative case has
 * been observed on this page — losses use a plain leading minus sign. */
function parseFigure(raw: string): number | null {
  const text = raw.trim();
  if (!text || text === "-") return null;
  const n = Number(text.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

/**
 * Parses one "label -> [current year, previous year]" table by its
 * `<caption>` text — the Annual Balance Sheet and Income Statement tables on
 * a PSE Edge "Financial Reports" page (`/companyPage/financial_reports_view.do`)
 * share this shape (`<tr><th>label</th><td class="alignR">current</td><td
 * class="alignR">previous</td></tr>`), same caption-lookup approach as
 * parseCompanyInfo.ts's parseKeyValueTable, except two value columns instead
 * of one. The page repeats these same captions again lower down for the
 * Quarterly section, so `.first()` matters: it relies on the Annual section
 * appearing first in document order (verified live) to avoid picking up the
 * quarterly figures instead.
 */
function parseFigureTable($: CheerioAPI, captionText: string): Record<string, FinancialStatementFigure> {
  const caption = $("table.view caption")
    .filter((_, el) => $(el).text().trim() === captionText)
    .first();
  if (caption.length === 0) return {};

  const values: Record<string, FinancialStatementFigure> = {};
  caption
    .closest("table")
    .find("tr")
    .each((_, row) => {
      const label = $(row).find("th").first().text().trim();
      const cells = $(row).find("td");
      if (!label || cells.length < 2) return;
      values[label] = {
        current: parseFigure($(cells[0]).text()),
        previous: parseFigure($(cells[1]).text()),
      };
    });
  return values;
}

/**
 * Parses the Annual Balance Sheet and Income Statement from a PSE Edge
 * "Financial Reports" page. Deliberately Annual only — the same page also has
 * a Quarterly section (same two table captions, further down), which this
 * doesn't attempt to parse. Returns null when the page has no "Annual"
 * heading at all (a company that's never filed one), same missing-data
 * contract as parseCompanyInfoHtml's null description.
 */
export function parseFinancialReportsHtml(html: string): ParsedAnnualFinancials | null {
  const $ = cheerio.load(html);

  const annualHeading = $("h3")
    .filter((_, el) => $(el).text().trim() === "Annual")
    .first();
  if (annualHeading.length === 0) return null;

  // The period/unit line sits in the next <p class="textCont"> sibling, e.g.
  // "For the fiscal year ended : Dec 31, 2025<br>Currency(and units, if
  // applicable) : PhP (in Millions)" — <br> is the only line separator, so it
  // has to be swapped for a real newline before splitting.
  const periodParagraph = annualHeading.nextAll("p.textCont").first();
  const periodHtml = (periodParagraph.html() ?? "").replace(/<br\s*\/?>/gi, "\n");
  const periodLines = periodHtml
    .split("\n")
    .map((line) => decodeEntities(line.replace(/<[^>]+>/g, "")).trim())
    .filter(Boolean);

  const fiscalYearEnded =
    periodLines.map((line) => line.match(/fiscal year ended\s*:\s*(.+)/i)?.[1]?.trim()).find(Boolean) ?? null;
  const currencyUnit =
    periodLines.map((line) => line.match(/currency.*?:\s*(.+)/i)?.[1]?.trim()).find(Boolean) ?? null;

  const balanceSheet = parseFigureTable($, "Balance Sheet");
  const incomeStatement = parseFigureTable($, "Income Statement");
  const bs = (label: string) => balanceSheet[label] ?? EMPTY_FIGURE;
  const is = (label: string) => incomeStatement[label] ?? EMPTY_FIGURE;

  return {
    fiscalYearEnded,
    currencyUnit,
    currentAssets: bs("Current Assets"),
    totalAssets: bs("Total Assets"),
    currentLiabilities: bs("Current Liabilities"),
    totalLiabilities: bs("Total Liabilities"),
    retainedEarnings: bs("Retained Earnings/(Deficit)"),
    stockholdersEquity: bs("Stockholders' Equity"),
    stockholdersEquityParent: bs("Stockholders' Equity - Parent"),
    bookValuePerShare: bs("Book Value Per Share"),
    grossRevenue: is("Gross Revenue"),
    grossExpense: is("Gross Expense"),
    incomeBeforeTax: is("Income/(Loss) Before Tax"),
    netIncomeAfterTax: is("Net Income/(Loss) After Tax"),
    netIncomeAttributableToParent: is("Net Income/(Loss) Attributable to Parent"),
    earningsPerShareBasic: is("Earnings/(Loss) Per Share (Basic)"),
    earningsPerShareDiluted: is("Earnings/(Loss) Per Share (Diluted)"),
  };
}
