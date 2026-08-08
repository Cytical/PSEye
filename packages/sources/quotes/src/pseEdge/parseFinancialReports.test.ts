import { describe, expect, it } from "vitest";
import { parseFinancialReportsHtml } from "./parseFinancialReports";

/**
 * Mirrors the real markup at
 * edge.pse.com.ph/companyPage/financial_reports_view.do?cmpy_id=260 (BDO),
 * verified live: an "Annual" <h3>, a period/unit <p class="textCont">, then
 * two <table class="view"> (Balance Sheet, Income Statement), followed by an
 * identically-shaped "Quarterly" section further down that the parser must
 * not pick up instead.
 */
const FULL_FINANCIAL_REPORTS_HTML = `
<div class="compInfo"><p>BDO Unibank, Inc.</p></div>
<p class="textCont">Information in this page will become available upon submission...</p>
<h3>Annual</h3>
<p class="textCont" style="margin-top:0;margin-bottom:0;font-size:1em;">
For the fiscal year ended : Dec 31, 2025<br>
Currency(and units, if applicable) : PhP (in Millions)</p>
<table class="view">
<caption>Balance Sheet</caption>
<tr><th>Item</th><th class="alignC">Current Year</th><th class="alignC">Previous Year</th></tr>
<tr><th>Current Assets</th><td class="alignR">2,046,694</td><td class="alignR">1,796,039</td></tr>
<tr><th>Total Assets</th><td class="alignR">5,431,556</td><td class="alignR">4,876,050</td></tr>
<tr><th>Current Liabilities</th><td class="alignR">4,427,171</td><td class="alignR">4,026,324</td></tr>
<tr><th>Total Liabilities</th><td class="alignR">4,787,410</td><td class="alignR">4,298,655</td></tr>
<tr><th>Retained Earnings/(Deficit)</th><td class="alignR">344,510</td><td class="alignR">291,654</td></tr>
<tr><th>Stockholders' Equity</th><td class="alignR">644,146</td><td class="alignR">577,395</td></tr>
<tr><th>Stockholders' Equity - Parent</th><td class="alignR">641,074</td><td class="alignR">574,671</td></tr>
<tr><th>Book Value Per Share</th><td class="alignR">119.03</td><td class="alignR">106.84</td></tr>
</table>
<table class="view">
<caption>Income Statement</caption>
<tr><th>Item</th><th class="alignC">Current Year</th><th class="alignC">Previous Year</th></tr>
<tr><th>Gross Revenue</th><td class="alignR">379,300</td><td class="alignR">349,777</td></tr>
<tr><th>Gross Expense</th><td class="alignR">256,692</td><td class="alignR">232,056</td></tr>
<tr><th>Income/(Loss) Before Tax</th><td class="alignR">107,601</td><td class="alignR">103,691</td></tr>
<tr><th>Net Income/(Loss) After Tax</th><td class="alignR">87,479</td><td class="alignR">82,220</td></tr>
<tr><th>Net Income/(Loss) Attributable to Parent</th><td class="alignR">87,174</td><td class="alignR">82,019</td></tr>
<tr><th>Earnings/(Loss) Per Share (Basic)</th><td class="alignR">16.28</td><td class="alignR">15.34</td></tr>
<tr><th>Earnings/(Loss) Per Share (Diluted)</th><td class="alignR">16.22</td><td class="alignR">15.30</td></tr>
</table>
<h3>Quarterly</h3>
<p class="textCont">For the period ended : Jun 30, 2026<br>Currency(and units, if applicable) : Phil. Peso in Millions</p>
<table class="view">
<caption>Balance Sheet</caption>
<tr><th>Item</th><th class="alignC">Period Ended</th><th class="alignC">Fiscal Year Ended(Audited)</th></tr>
<tr><th>Current Assets</th><td class="alignR">2,020,474</td><td class="alignR">2,046,694</td></tr>
</table>
<table class="view">
<caption>Income Statement</caption>
<tr><th>Item</th><th class="alignC">Period Ended</th><th class="alignC">Fiscal Year Ended(Audited)</th></tr>
<tr><th>Gross Revenue</th><td class="alignR">99,999</td><td class="alignR">379,300</td></tr>
</table>
`;

/** No "Annual" heading at all — a company that's never filed. */
const NO_ANNUAL_SECTION_HTML = `
<div class="compInfo"><p>Example Corp.</p></div>
<p class="textCont">Information in this page will become available upon submission...</p>
`;

/**
 * Manulife's real currency line, which PSE Edge serves HTML-escaped as
 * "CSM except EPS &amp; BV". These lines are read off .html() rather than
 * .text() so the <br> survives long enough to become a line separator, which
 * means nothing decodes entities on the way through and the raw "&amp;" used
 * to reach the DB and render literally on the company page.
 */
const ENTITY_ESCAPED_HTML = `
<h3>Annual</h3>
<p class="textCont">For the fiscal year ended : Dec 31, 2025<br>Currency(and units, if applicable) : CSM except EPS &amp; BV</p>
<table class="view">
<caption>Income Statement</caption>
<tr><th>Item</th><th class="alignC">Current Year</th><th class="alignC">Previous Year</th></tr>
<tr><th>Earnings/(Loss) Per Share (Basic)</th><td class="alignR">3.08</td><td class="alignR">2.94</td></tr>
</table>
`;

/** Mirrors a real loss-making company (MRC Allied), where negative figures
 * use a plain leading minus sign, not parentheses, and one company (CTS
 * Global) whose EPS row can literally be "-" rather than a number. */
const NEGATIVE_AND_DASH_HTML = `
<h3>Annual</h3>
<p class="textCont">For the fiscal year ended : Dec 31, 2025<br>Currency(and units, if applicable) : PHP</p>
<table class="view">
<caption>Balance Sheet</caption>
<tr><th>Item</th><th class="alignC">Current Year</th><th class="alignC">Previous Year</th></tr>
<tr><th>Retained Earnings/(Deficit)</th><td class="alignR">-34,847,338</td><td class="alignR">-221,302,547</td></tr>
</table>
<table class="view">
<caption>Income Statement</caption>
<tr><th>Item</th><th class="alignC">Current Year</th><th class="alignC">Previous Year</th></tr>
<tr><th>Net Income/(Loss) After Tax</th><td class="alignR">-65,331,593</td><td class="alignR">-7,420,561</td></tr>
<tr><th>Earnings/(Loss) Per Share (Diluted)</th><td class="alignR">-</td><td class="alignR">-</td></tr>
</table>
`;

describe("parseFinancialReportsHtml", () => {
  it("parses the Annual period, currency unit, and all balance sheet / income statement figures", () => {
    const result = parseFinancialReportsHtml(FULL_FINANCIAL_REPORTS_HTML)!;
    expect(result.fiscalYearEnded).toBe("Dec 31, 2025");
    expect(result.currencyUnit).toBe("PhP (in Millions)");
    expect(result.totalAssets).toEqual({ current: 5431556, previous: 4876050 });
    expect(result.bookValuePerShare).toEqual({ current: 119.03, previous: 106.84 });
    expect(result.netIncomeAttributableToParent).toEqual({ current: 87174, previous: 82019 });
    expect(result.earningsPerShareBasic).toEqual({ current: 16.28, previous: 15.34 });
  });

  it("takes the Annual section's figures, not the identically-captioned Quarterly ones further down", () => {
    const result = parseFinancialReportsHtml(FULL_FINANCIAL_REPORTS_HTML)!;
    // Quarterly's Current Assets/Gross Revenue rows use different numbers
    // (2,020,474 / 99,999) — if the parser picked the wrong table these
    // would leak through instead of the Annual figures asserted above.
    expect(result.currentAssets).toEqual({ current: 2046694, previous: 1796039 });
    expect(result.grossRevenue).toEqual({ current: 379300, previous: 349777 });
  });

  it("returns null when there's no Annual section at all", () => {
    expect(parseFinancialReportsHtml(NO_ANNUAL_SECTION_HTML)).toBeNull();
  });

  it("parses a plain leading minus sign as a negative number, and a bare dash as null", () => {
    const result = parseFinancialReportsHtml(NEGATIVE_AND_DASH_HTML)!;
    expect(result.retainedEarnings).toEqual({ current: -34847338, previous: -221302547 });
    expect(result.netIncomeAfterTax).toEqual({ current: -65331593, previous: -7420561 });
    expect(result.earningsPerShareDiluted).toEqual({ current: null, previous: null });
  });

  it("falls back to an empty figure for a row the table doesn't have", () => {
    const result = parseFinancialReportsHtml(NEGATIVE_AND_DASH_HTML)!;
    expect(result.totalAssets).toEqual({ current: null, previous: null });
  });

  it("decodes HTML entities in the currency line", () => {
    const result = parseFinancialReportsHtml(ENTITY_ESCAPED_HTML)!;
    expect(result.currencyUnit).toBe("CSM except EPS & BV");
  });
});
