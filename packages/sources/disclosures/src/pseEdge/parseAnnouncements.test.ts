import { describe, expect, it } from "vitest";
import { PSE_EDGE_COMPANIES } from "@pseye/source-quotes";
import { classifyTemplate, parseAnnouncementsHtml, parseAnnounceDateToUtcIso, parseTotalPages } from "./parseAnnouncements";

const bdo = PSE_EDGE_COMPANIES.find((c) => c.ticker === "BDO")!;

/** Trimmed to two rows, mirroring the exact markup `/announcements/search.ax` returns (verified live). */
const SEARCH_RESULT_HTML = `
<span class="count">
[1 /
3]
[Total 138]
</span>
<table class="list">
<thead>
  <tr>
    <th>Company Name</th>
    <th>Template Name</th>
    <th>PSE Form Number</th>
    <th>Announce Date and Time</th>
    <th>Circular Number</th>
  </tr>
</thead>
<tbody>
  <tr>
    <td><a href="/companyInformation/form.do?cmpy_id=${bdo.cmpyId}">BDO Unibank, Inc.</a></td>
    <td><a href="#viewer" onclick="openPopup('30a8f4f46bdfbf9364d70b69f0a3140b');return false;">Material Information/Transactions</a></td>
    <td class="alignC">4-31</td>
    <td class="alignC">Jul 16, 2026 04:08 PM</td>
    <td class="alignC">C05437-2026</td>
  </tr>
  <tr>
    <td><a href="/companyInformation/form.do?cmpy_id=999999">Some Untracked Company</a></td>
    <td><a href="#viewer" onclick="openPopup('e0e535e0c7d105f864d70b69f0a3140b');return false;">Press Release</a></td>
    <td class="alignC">4-25</td>
    <td class="alignC">Jul 16, 2026 03:43 PM</td>
    <td class="alignC">C05436-2026</td>
  </tr>
</tbody>
</table>
`;

describe("parseAnnouncementsHtml", () => {
  it("parses a tracked company's row and drops rows for companies outside our roster", () => {
    const result = parseAnnouncementsHtml(SEARCH_RESULT_HTML);

    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      ticker: "BDO",
      companyName: bdo.companyName,
      type: "material_information",
      headline: "Material Information/Transactions",
      referenceNo: "C05437-2026",
      url: "https://edge.pse.com.ph/openDiscViewer.do?edge_no=30a8f4f46bdfbf9364d70b69f0a3140b",
    });
  });

  it("converts PSE Edge's Asia/Manila wall-clock time to a correct UTC instant", () => {
    const result = parseAnnouncementsHtml(SEARCH_RESULT_HTML);
    // Jul 16, 2026 04:08 PM in UTC+8 == Jul 16, 2026 08:08 AM UTC.
    expect(result[0].filedAt).toBe("2026-07-16T08:08:00.000Z");
  });

  it("returns an empty array for a page with no rows", () => {
    expect(parseAnnouncementsHtml("<table class=\"list\"><tbody></tbody></table>")).toEqual([]);
  });
});

describe("parseAnnounceDateToUtcIso", () => {
  it("parses a PM time", () => {
    expect(parseAnnounceDateToUtcIso("Jul 16, 2026 05:33 PM")).toBe("2026-07-16T09:33:00.000Z");
  });

  it("parses a 12:xx AM time as midnight, not noon", () => {
    expect(parseAnnounceDateToUtcIso("Jan 1, 2026 12:15 AM")).toBe("2025-12-31T16:15:00.000Z");
  });

  it("parses a 12:xx PM time as noon", () => {
    expect(parseAnnounceDateToUtcIso("Jan 1, 2026 12:15 PM")).toBe("2026-01-01T04:15:00.000Z");
  });

  it("returns null for unrecognized text", () => {
    expect(parseAnnounceDateToUtcIso("not a date")).toBeNull();
  });
});

describe("classifyTemplate", () => {
  it("maps known template names to their category", () => {
    expect(classifyTemplate("Material Information/Transactions")).toBe("material_information");
    expect(classifyTemplate("Change in Shareholdings of Directors and Principal Officers")).toBe(
      "insider_trading_report"
    );
    expect(classifyTemplate("Public Ownership Report")).toBe("public_ownership_report");
    expect(classifyTemplate("Notice of Analysts'/Investors' Briefing")).toBe("analyst_briefing");
  });

  it("falls back to other for an unmatched template name", () => {
    expect(classifyTemplate("Results of Annual or Special Stockholders' Meeting")).toBe("other");
  });
});

describe("parseTotalPages", () => {
  it("extracts the total page count from the count block", () => {
    expect(parseTotalPages(SEARCH_RESULT_HTML)).toBe(3);
  });

  it("returns null when the count block is missing", () => {
    expect(parseTotalPages("<table></table>")).toBeNull();
  });
});
