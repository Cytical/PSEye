import { describe, expect, it } from "vitest";
import { parseIndexSummaryHtml } from "./parseIndexSummary";

const FIXTURE_HTML = `
<div class="index">
  <h3>Index Summary
  <a href="/index/form.do"><img src="/images/main/icon_more.gif" alt="more" /></a></h3>
  <table>
  <thead>
  <tr>
    <th>Index</th>
    <th>Value</th>
    <th>Chg</th>
    <th class="end">%Chg</th>
  </tr>
  </thead>
  <tbody>
<tr>
    <td class="label">PSEi</td>
    <td class="alignR">6,325.15</td>
    <td class="alignR" style="color:green">
      22.65</td>
    <td class="alignR" style="color:green">
      0.36▲</td>
  </tr>
<tr>
    <td class="label">Industrial</td>
    <td class="alignR">8,337.62</td>
    <td class="alignR" style="color:red">
       0.47</td>
    <td class="alignR" style="color:red">
       0.01▼</td>
  </tr>
</tbody>
  </table>
</div>
`;

describe("parseIndexSummaryHtml", () => {
  it("parses the PSEi row with a positive (green) change", () => {
    expect(parseIndexSummaryHtml(FIXTURE_HTML)).toEqual({
      value: 6325.15,
      change: 22.65,
      pctChange: 0.36,
    });
  });

  it("negates the value for a red (down) row", () => {
    expect(parseIndexSummaryHtml(FIXTURE_HTML, "Industrial")).toEqual({
      value: 8337.62,
      change: -0.47,
      pctChange: -0.01,
    });
  });

  it("returns null when the named index isn't in the table", () => {
    expect(parseIndexSummaryHtml(FIXTURE_HTML, "Nonexistent")).toBeNull();
  });
});
