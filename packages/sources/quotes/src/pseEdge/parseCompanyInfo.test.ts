import { describe, expect, it } from "vitest";
import { parseCompanyInfoHtml } from "./parseCompanyInfo";

/**
 * Fixture mirrors the exact markup PSE Edge's `/companyInformation/form.do`
 * returns (verified against the live site while building this parser): a
 * `<table class="view"><caption>Company Description</caption>` whose single
 * `<td>` joins paragraphs with `<br/><br/>` and ends with a "Source: ..." line.
 */
const COMPANY_INFO_HTML = `
<div class="compInfo">
  <p style="margin-top:0px;">SM Investments Corporation</p>
</div>
<div id="dataList">
  <table class="view">
    <caption>Company Description</caption>
    <tr>
      <td>SM Investments Corporation (SM) was incorporated on January 15, 1960 to serve as the holding company of the SM Group with interests in retail, property and banking.<br/><br/>The Company also has equity investments in other sectors such as leisure and logistics.<br/><br/>Source: SEC Form 17-A (2024)</td>
    </tr>
  </table>
  <table class="view">
    <caption>Security Information</caption>
    <tr><th>Sector</th><td>Holding Firms</td></tr>
  </table>
</div>
`;

const NO_DESCRIPTION_HTML = `
<div id="dataList">
  <table class="view">
    <caption>Security Information</caption>
    <tr><th>Sector</th><td>Holding Firms</td></tr>
  </table>
</div>
`;

const NO_SOURCE_LINE_HTML = `
<table class="view">
  <caption>Company Description</caption>
  <tr><td>A short description with no cited filing.</td></tr>
</table>
`;

/** Mirrors the real markup at edge.pse.com.ph/companyInformation/form.do?cmpy_id=260 (BDO), verified live. */
const FULL_COMPANY_INFO_HTML = `
<div class="compInfo"><p>BDO Unibank, Inc.</p></div>
<div id="dataList">
  <table class="view">
    <caption>Company Description</caption>
    <tr><td>BDO Unibank Inc. (BDO) was acquired by the SM Group in 1976.<br/><br/>Source: SEC Form 17-A (2024)</td></tr>
  </table>
  <table class="view">
  <caption>Security Information</caption>
    <colgroup><col width="28%"/><col width="72%"/></colgroup>
    <tr><th>Sector</th><td>Financials</td></tr>
    <tr><th>Subsector</th><td>Banks</td></tr>
    <tr><th>Incorporation Date</th><td>Dec 20, 1967</td></tr>
    <tr><th>Number of Directors</th><td>11</td></tr>
    <tr><th>Fiscal Year</th><td>12/31
      (Month/Day)
      </td></tr>
    <tr><th>External Auditor</th><td>Punongbayan &amp; Araullo	</td></tr>
    <tr><th>Transfer Agent</th><td>Stock Transfer Service, Inc.</td></tr>
  </table>
  <table class="view">
  <caption>Contact Information</caption>
    <tr><th>Business Address</th><td>BDO Corporate Center, 7899 Makati Avenue, Makati City (Principal Address);
BDO Towers Valero, 8741 Paseo de Roxas, Salcedo Village, Makati City 1226, Philippines (Business Address)</td></tr>
    <tr><th>Telephone Number</th><td>(632) 8840-7000 / 8702-6000</td></tr>
    <tr><th>Website</th><td>http://www.bdo.com.ph </td></tr>
  </table>
</div>
`;

describe("parseCompanyInfoHtml", () => {
  it("extracts the description as separate paragraphs and splits out the cited source", () => {
    const result = parseCompanyInfoHtml(COMPANY_INFO_HTML);
    expect(result.description).toBe(
      "SM Investments Corporation (SM) was incorporated on January 15, 1960 to serve as the holding company of the SM Group with interests in retail, property and banking.\n\nThe Company also has equity investments in other sectors such as leisure and logistics."
    );
    expect(result.citedSource).toBe("SEC Form 17-A (2024)");
  });

  it("returns nulls when the page has no Company Description table", () => {
    const result = parseCompanyInfoHtml(NO_DESCRIPTION_HTML);
    expect(result.description).toBeNull();
    expect(result.citedSource).toBeNull();
  });

  it("returns a null citedSource when there is no Source: line", () => {
    const result = parseCompanyInfoHtml(NO_SOURCE_LINE_HTML);
    expect(result.description).toBe("A short description with no cited filing.");
    expect(result.citedSource).toBeNull();
  });

  it("extracts Security/Contact Information fields, collapsing embedded whitespace", () => {
    const result = parseCompanyInfoHtml(FULL_COMPANY_INFO_HTML);
    expect(result.incorporationDate).toBe("Dec 20, 1967");
    expect(result.numberOfDirectors).toBe(11);
    expect(result.fiscalYearEnd).toBe("12/31 (Month/Day)");
    expect(result.externalAuditor).toBe("Punongbayan & Araullo");
    expect(result.businessAddress).toBe(
      "BDO Corporate Center, 7899 Makati Avenue, Makati City (Principal Address); BDO Towers Valero, 8741 Paseo de Roxas, Salcedo Village, Makati City 1226, Philippines (Business Address)"
    );
    expect(result.website).toBe("http://www.bdo.com.ph");
  });

  it("returns nulls for the extra fields when the Security/Contact tables are absent", () => {
    const result = parseCompanyInfoHtml(NO_SOURCE_LINE_HTML);
    expect(result.incorporationDate).toBeNull();
    expect(result.numberOfDirectors).toBeNull();
    expect(result.externalAuditor).toBeNull();
    expect(result.fiscalYearEnd).toBeNull();
    expect(result.businessAddress).toBeNull();
    expect(result.website).toBeNull();
  });
});
