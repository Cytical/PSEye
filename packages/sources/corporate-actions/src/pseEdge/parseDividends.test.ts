import { describe, expect, it } from "vitest";
import { PSE_EDGE_COMPANIES } from "@pseye/source-quotes";
import { parseDividendsHtml, parsePseEdgeDate, parseTotalPages } from "./parseDividends";

const bdo = PSE_EDGE_COMPANIES.find((c) => c.ticker === "BDO")!;

/** Trimmed to real rows, mirroring the exact markup the live `.ax` endpoint returns. */
const DIVIDENDS_RESULT_HTML = `
<span class="count">
[1 /
11]
[Total 520]
</span>
<table class="list">
<thead>
  <tr>
    <th>Company Name</th>
    <th>Type of Security</th>
    <th>Type of Dividend</th>
    <th>Dividend Rate</th>
    <th>Ex-Dividend Date</th>
    <th>Record Date</th>
    <th>Payment Date</th>
    <th>Circular Number</th>
  </tr>
</thead>
<tbody>
<tr>
    <td><a href="/companyInformation/form.do?cmpy_id=${bdo.cmpyId}">BDO Unibank, Inc.</a></td>
    <td class="alignC">COMMON</td>
    <td class="alignC">Cash</td>
    <td class="alignR">P0.50</td>
    <td class="alignC">Dec 01, 2026</td>
    <td class="alignC">Dec 2, 2026</td>
    <td class="alignC">Dec 18, 2026</td>
    <td class="alignC"><a href="#viewer" onclick="openPopup('x');return false;">C04854-2026</a></td>
  </tr>
<tr>
    <td><a href="/companyInformation/form.do?cmpy_id=${bdo.cmpyId}">BDO Unibank, Inc.</a></td>
    <td class="alignC">BDOPM Series B</td>
    <td class="alignC">Cash</td>
    <td class="alignR">Php 2.0625 per share</td>
    <td class="alignC">Feb 08, 2027</td>
    <td class="alignC">Feb 9, 2027</td>
    <td class="alignC">Feb 23, 2027</td>
    <td class="alignC"><a href="#viewer" onclick="openPopup('y');return false;">C00595-2026</a></td>
  </tr>
<tr>
    <td><a href="/companyInformation/form.do?cmpy_id=999999">Untracked Company</a></td>
    <td class="alignC">COMMON</td>
    <td class="alignC">Cash</td>
    <td class="alignR">P1.00</td>
    <td class="alignC">Jan 01, 2027</td>
    <td class="alignC">Jan 2, 2027</td>
    <td class="alignC">Jan 15, 2027</td>
    <td class="alignC"><a href="#viewer" onclick="openPopup('z');return false;">C09999-2026</a></td>
  </tr>
<tr>
    <td><a href="/companyInformation/form.do?cmpy_id=${bdo.cmpyId}">BDO Unibank, Inc.</a></td>
    <td class="alignR">TBA</td>
    <td class="alignC">Rights</td>
    <td class="alignR">TBA</td>
    <td class="alignC">TBA</td>
    <td class="alignC">TBA</td>
    <td class="alignC">TBA</td>
    <td class="alignC"><a href="#viewer" onclick="openPopup('w');return false;">C00001-2026</a></td>
  </tr>
</tbody>
</table>
`;

describe("parseDividendsHtml", () => {
  it("parses a common-stock cash dividend for a tracked company", () => {
    const result = parseDividendsHtml(DIVIDENDS_RESULT_HTML);
    const bdoRow = result.find((r) => r.ticker === "BDO");

    expect(bdoRow).toMatchObject({
      companyName: "BDO Unibank",
      type: "cash_dividend",
      exDate: "2026-12-01",
      recordDate: "2026-12-02",
      paymentDate: "2026-12-18",
      details: "P0.50",
    });
  });

  it("folds a non-common security's type into details rather than mislabeling the common ticker", () => {
    const result = parseDividendsHtml(DIVIDENDS_RESULT_HTML);
    const abraRow = result.find((r) => r.details.includes("Series B"));

    expect(abraRow?.details).toBe("Php 2.0625 per share (BDOPM Series B)");
  });

  it("drops rows for companies outside the tracked roster", () => {
    const result = parseDividendsHtml(DIVIDENDS_RESULT_HTML);
    expect(result.some((r) => r.companyName === "Untracked Company")).toBe(false);
  });

  it("drops rows with an unrecognized dividend type (e.g. Rights) or unparseable TBA dates", () => {
    const result = parseDividendsHtml(DIVIDENDS_RESULT_HTML);
    expect(result).toHaveLength(2);
  });
});

describe("parsePseEdgeDate", () => {
  it("parses a zero-padded day with a comma", () => {
    expect(parsePseEdgeDate("Feb 08, 2027")).toBe("2027-02-08");
  });

  it("parses a non-padded day", () => {
    expect(parsePseEdgeDate("Dec 2, 2026")).toBe("2026-12-02");
  });

  it("returns null for TBA", () => {
    expect(parsePseEdgeDate("TBA")).toBeNull();
  });
});

describe("parseTotalPages", () => {
  it("extracts the total page count", () => {
    expect(parseTotalPages(DIVIDENDS_RESULT_HTML)).toBe(11);
  });
});
