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

// PSE Edge pads a space before the digit for some rows (verbatim from CBC,
// cmpy_id=184, at time of writing) — regression fixture for the bug where
// this padded form silently parsed as null instead of a negative change.
const DOWN_STOCK_PADDED_HTML = `
<table class="view">
<tr>
  <th>Status</th>
  <td>Active</td>
  <th>Market Capitalization</th>
  <td style="text-align:right;padding-right:1.5em;">
    123,456,789.00</td>
</tr>
</table>
<table class="view">
<tr>
  <th>Last Traded Price</th>
  <td style="text-align:right;padding-right:1.2em;">
56.55</td>
  <th>Open</th>
  <td style="text-align:right;padding-right:1.2em;">
57.00</td>
  <th>Previous Close and Date</th>
  <td style="text-align:right;padding-right:1.2em;">
56.70
    (Jul 15, 2026)
  </td>
</tr>
<tr>
  <th>Change(% Change)</th>
  <td style="text-align:right;padding-right:1.2em;">
down&nbsp;
   0.65
  ( 1.15%)
  </td>
  <th>High</th>
  <td style="text-align:right;padding-right:1.2em;">
56.80</td>
  <th>P/E Ratio</th>
  <td style="text-align:right;padding-right:1.2em;">
</td>
</tr>
</table>
`;

// Confirmed live 2026-07-17: on that day's after-close scrape, PSE Edge's
// "Change(% Change)" cell rendered with no "up"/"down" word at all for every
// down-moving ticker (~40 of 97 tracked tickers, none of them fetch
// failures) even though both a real Last Traded Price and a real Previous
// Close were present — the regression this fixture guards is
// parseStockDataHtml silently returning null instead of falling back to
// deriving the change from those two numbers.
const MISSING_CHANGE_WORD_HTML = `
<table class="view">
<tr>
  <th>Status</th>
  <td>Active</td>
  <th>Market Capitalization</th>
  <td style="text-align:right;padding-right:1.5em;">
    73,961,324,772.00</td>
</tr>
</table>
<table class="view">
<tr>
  <th>Last Traded Price</th>
  <td style="text-align:right;padding-right:1.2em;">
50.60</td>
  <th>Open</th>
  <td style="text-align:right;padding-right:1.2em;">
50.80</td>
  <th>Previous Close and Date</th>
  <td style="text-align:right;padding-right:1.2em;">
50.80
    (Jul 16, 2026)
  </td>
</tr>
<tr>
  <th>Change(% Change)</th>
  <td style="text-align:right;padding-right:1.2em;">
  </td>
  <th>High</th>
  <td style="text-align:right;padding-right:1.2em;">
50.80</td>
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

  it("parses a negative change with PSE Edge's padded-space format", () => {
    expect(parseStockDataHtml(DOWN_STOCK_PADDED_HTML)).toEqual({
      price: 56.55,
      pctChange: -1.15,
      marketCap: 123_456_789,
    });
  });

  it("derives change from price vs. previous close when the Change cell has no up/down word", () => {
    expect(parseStockDataHtml(MISSING_CHANGE_WORD_HTML)).toEqual({
      price: 50.6,
      pctChange: -0.39,
      marketCap: 73_961_324_772,
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
