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
});
