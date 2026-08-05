import { describe, expect, it } from "vitest";
import { parseDirectorsAndManagementHtml } from "./parseDirectorsAndManagement";

/**
 * Mirrors the real markup at
 * edge.pse.com.ph/companyPage/directors_and_management_list.do?cmpy_id=260
 * (BDO), verified live: two `<table class="list">`, "Board of Directors" in
 * a `.boxLeft` wrapper and "Management Officers" in `.boxRight`, both
 * `<caption>`-labeled with `<tbody><tr><td>position</td><td>name</td></tr>`
 * rows.
 */
const FULL_DIRECTORS_HTML = `
<div class="compInfo"><p>BDO Unibank, Inc.</p></div>
<div class="boxLeft">
<table class="list">
<caption>Board of Directors</caption>
<thead><tr><th>Position</th><th>Name</th></tr></thead>
<tbody>
<tr><td>Chairperson</td><td>Teresita T. Sy</td></tr>
<tr><td>Director</td><td>Nestor V. Tan</td></tr>
<tr><td>Lead Independent Director</td><td>Estela P. Bernabe</td></tr>
<tr><td>Independent Director</td><td>Vicente S. Pérez, Jr.</td></tr>
</tbody>
</table>
</div>
<div class="boxRight">
<table class="list">
<caption>Management Officers</caption>
<thead><tr><th>Position</th><th>Name</th></tr></thead>
<tbody>
<tr><td>President and Chief Executive Officer</td><td>Nestor V. Tan</td></tr>
<tr><td>Treasurer </td><td>Arnold Q. Bengco</td></tr>
</tbody>
</table>
</div>
`;

/** Mirrors a company (PTC) whose markup has stray trailing whitespace and
 * double spaces on some cells — real PSE Edge formatting artifacts, not a
 * fixture typo. */
const WHITESPACE_ARTIFACT_HTML = `
<div class="boxLeft">
<table class="list">
<caption>Board of Directors</caption>
<tbody>
<tr><td>Director</td><td>Alma F. Buntua  </td></tr>
</tbody>
</table>
</div>
<div class="boxRight">
<table class="list">
<caption>Management Officers</caption>
<tbody>
<tr><td>First Vice President and Assistant Corporate Secretary </td><td>Agnes B. Urbano</td></tr>
</tbody>
</table>
</div>
`;

/** No data on file for either table — the markup PSE Edge would presumably
 * render for a company with nothing filed (not yet observed live, since
 * every ticker checked so far has both tables, but the parser must degrade
 * to empty arrays rather than throw). */
const NO_DATA_HTML = `
<div class="compInfo"><p>Example Corp.</p></div>
`;

describe("parseDirectorsAndManagementHtml", () => {
  it("parses both the Board of Directors and Management Officers tables", () => {
    const result = parseDirectorsAndManagementHtml(FULL_DIRECTORS_HTML);
    expect(result.boardOfDirectors).toEqual([
      { position: "Chairperson", name: "Teresita T. Sy" },
      { position: "Director", name: "Nestor V. Tan" },
      { position: "Lead Independent Director", name: "Estela P. Bernabe" },
      { position: "Independent Director", name: "Vicente S. Pérez, Jr." },
    ]);
    expect(result.managementOfficers).toEqual([
      { position: "President and Chief Executive Officer", name: "Nestor V. Tan" },
      { position: "Treasurer", name: "Arnold Q. Bengco" },
    ]);
  });

  it("trims stray whitespace PSE Edge's own markup leaves on position/name cells", () => {
    const result = parseDirectorsAndManagementHtml(WHITESPACE_ARTIFACT_HTML);
    expect(result.boardOfDirectors).toEqual([{ position: "Director", name: "Alma F. Buntua" }]);
    expect(result.managementOfficers).toEqual([
      { position: "First Vice President and Assistant Corporate Secretary", name: "Agnes B. Urbano" },
    ]);
  });

  it("returns empty arrays, not an error, when neither table is present", () => {
    const result = parseDirectorsAndManagementHtml(NO_DATA_HTML);
    expect(result.boardOfDirectors).toEqual([]);
    expect(result.managementOfficers).toEqual([]);
  });
});
