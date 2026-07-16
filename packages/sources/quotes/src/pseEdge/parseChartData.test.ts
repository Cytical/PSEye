import { describe, expect, it } from "vitest";
import { parseChartDataJson, parseSecurityId } from "./parseChartData";

const CHART_JSON = JSON.stringify({
  chartData: [
    { OPEN: 118.8, VALUE: 6.01e8, CLOSE: 119.0, CHART_DATE: "Jul 01, 2026 00:00:00", HIGH: 120.4, LOW: 118.0 },
    { OPEN: 119.0, VALUE: 3.98e8, CLOSE: 120.3, CHART_DATE: "Jul 02, 2026 00:00:00", HIGH: 123.9, LOW: 119.0 },
  ],
  tableData: [{ SM_DM: "Jul 02, 2026 08:04 AM", SUBJECT_TITLE: "Press Release" }],
});

describe("parseChartDataJson", () => {
  it("extracts date/close pairs from chartData, ignoring tableData", () => {
    expect(parseChartDataJson(CHART_JSON)).toEqual([
      { date: "2026-07-01", close: 119.0 },
      { date: "2026-07-02", close: 120.3 },
    ]);
  });

  it("sorts ascending by date regardless of input order", () => {
    const reversed = JSON.stringify({
      chartData: [
        { CLOSE: 120.3, CHART_DATE: "Jul 02, 2026 00:00:00" },
        { CLOSE: 119.0, CHART_DATE: "Jul 01, 2026 00:00:00" },
      ],
    });
    expect(parseChartDataJson(reversed).map((h) => h.date)).toEqual(["2026-07-01", "2026-07-02"]);
  });

  it("returns an empty array for malformed JSON", () => {
    expect(parseChartDataJson("not json")).toEqual([]);
  });

  it("returns an empty array when chartData is missing", () => {
    expect(parseChartDataJson(JSON.stringify({ tableData: [] }))).toEqual([]);
  });
});

describe("parseSecurityId", () => {
  it("extracts the selected security_id option value", () => {
    const html = `<select name="security_id" onchange="document.form1.submit();">
<option value="468" selected>BDO</option>
</select>`;
    expect(parseSecurityId(html)).toBe("468");
  });

  it("returns null when no security_id select is present", () => {
    expect(parseSecurityId("<html></html>")).toBeNull();
  });
});
