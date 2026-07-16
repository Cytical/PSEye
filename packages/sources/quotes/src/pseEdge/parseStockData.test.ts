import { describe, expect, it } from "vitest";
import { parseStockDataHtml } from "./parseStockData";

/**
 * Fixtures mirror the exact markup PSE Edge's `/companyPage/stockData.do`
 * returns (verified against the live site while building this parser): two
 * adjacent `<table class="view">` blocks, `<th>`/`<td>` pairs per row, and
 * `&nbsp;` between the up/down word and the change figure.
 */
const ACTIVE_STOCK_HTML = `
<table class="view">
<tr>
  <th>Status</th>
  <td>Active</td>
  <th>Market Capitalization</th>
  <td style="text-align:right;padding-right:1.5em;">
    661,581,047,968.00</td>
</tr>
</table>
<table class="view">
<tr>
  <th>Last Traded Price</th>
  <td style="text-align:right;padding-right:1.2em;">
126.40</td>
  <th>Open</th>
  <td style="text-align:right;padding-right:1.2em;">
125.40</td>
  <th>Previous Close and Date</th>
  <td style="text-align:right;padding-right:1.2em;">
124.00
    (Jul 15, 2026)
  </td>
</tr>
<tr>
  <th>Change(% Change)</th>
  <td style="text-align:right;padding-right:1.2em;">
up&nbsp;
  2.40
  (1.94%)
  </td>
  <th>High</th>
  <td style="text-align:right;padding-right:1.2em;">
126.40</td>
  <th>P/E Ratio</th>
  <td style="text-align:right;padding-right:1.2em;">
</td>
</tr>
</table>
`;

const DOWN_STOCK_HTML = `
<table class="view">
<tr>
  <th>Status</th>
  <td>Active</td>
  <th>Market Capitalization</th>
  <td style="text-align:right;padding-right:1.5em;">
    19,641,424,982.40</td>
</tr>
</table>
<table class="view">
<tr>
  <th>Last Traded Price</th>
  <td style="text-align:right;padding-right:1.2em;">
13.44</td>
  <th>Open</th>
  <td style="text-align:right;padding-right:1.2em;">
13.56</td>
  <th>Previous Close and Date</th>
  <td style="text-align:right;padding-right:1.2em;">
13.68
    (Jul 15, 2026)
  </td>
</tr>
<tr>
  <th>Change(% Change)</th>
  <td style="text-align:right;padding-right:1.2em;">
down&nbsp;
  0.240
  (1.75%)
  </td>
  <th>High</th>
  <td style="text-align:right;padding-right:1.2em;">
13.68</td>
  <th>P/E Ratio</th>
  <td style="text-align:right;padding-right:1.2em;">
</td>
</tr>
</table>
`;

// Real shape of a suspended ticker's page (no last traded price, no change,
// no volume) — verbatim from PSE Edge's AAA (cmpy_id=55) at time of writing.
const SUSPENDED_STOCK_HTML = `
<table class="view">
<tr>
  <th>Status</th>
  <td>Suspended</td>
  <th>Market Capitalization</th>
  <td style="text-align:right;padding-right:1.5em;">
    1,303,999,969.03</td>
</tr>
</table>
<table class="view">
<tr>
  <th>Last Traded Price</th>
  <td style="text-align:right;padding-right:1.2em;">
</td>
  <th>Open</th>
  <td style="text-align:right;padding-right:1.2em;">
</td>
  <th>Previous Close and Date</th>
  <td style="text-align:right;padding-right:1.2em;">
1.63
    (May 15, 2015)
  </td>
</tr>
<tr>
  <th>Change(% Change)</th>
  <td style="text-align:right;padding-right:1.2em;">
down&nbsp;

  (%)
  </td>
  <th>High</th>
  <td style="text-align:right;padding-right:1.2em;">
</td>
  <th>P/E Ratio</th>
  <td style="text-align:right;padding-right:1.2em;">
</td>
</tr>
</table>
`;

describe("parseStockDataHtml", () => {
  it("parses an actively-traded stock with a positive change", () => {
    expect(parseStockDataHtml(ACTIVE_STOCK_HTML)).toEqual({
      price: 126.4,
      pctChange: 1.94,
      marketCap: 661_581_047_968,
    });
  });

  it("parses an actively-traded stock with a negative change", () => {
    expect(parseStockDataHtml(DOWN_STOCK_HTML)).toEqual({
      price: 13.44,
      pctChange: -1.75,
      marketCap: 19_641_424_982.4,
    });
  });

  it("reports N/A (null) price and change for a suspended stock, not 0", () => {
    const result = parseStockDataHtml(SUSPENDED_STOCK_HTML);
    expect(result.price).toBeNull();
    expect(result.pctChange).toBeNull();
    expect(result.marketCap).toBe(1_303_999_969.03);
  });

  it("returns all-null fields for a page with none of the expected table structure", () => {
    expect(parseStockDataHtml("<html><body>not a PSE Edge page</body></html>")).toEqual({
      price: null,
      pctChange: null,
      marketCap: null,
    });
  });
});
