import { describe, expect, it } from "vitest";
import { latestMarketWatchLink } from "./pseMarketWatchForeignFlowSource";

const SAMPLE_HTML = `
<a href="https://documents.pse.com.ph/wp-content/uploads/sites/15/2026/06/wk23_jun2026mktwatch.pdf">Week 23</a>
<a href="https://documents.pse.com.ph/wp-content/uploads/sites/15/2026/06/wk24_jun2026mktwatch.pdf">Week 24</a>
<a href="https://documents.pse.com.ph/wp-content/uploads/sites/15/2026/07/wk27_jul2026mktwatch.pdf">Week 27</a>
<a href="https://documents.pse.com.ph/wp-content/uploads/sites/15/2026/07/wk28_jul2026mktwatch.pdf">Week 28</a>
<a href="https://documents.pse.com.ph/wp-content/uploads/sites/15/2025/12/wk52_dec2025mktwatch.pdf">Week 52 (older year)</a>
`;

describe("latestMarketWatchLink", () => {
  it("picks the link with the highest week number", () => {
    expect(latestMarketWatchLink(SAMPLE_HTML)).toBe(
      "https://documents.pse.com.ph/wp-content/uploads/sites/15/2026/07/wk28_jul2026mktwatch.pdf"
    );
  });

  it("returns null when no market watch links are present", () => {
    expect(latestMarketWatchLink("<html><body>nothing here</body></html>")).toBeNull();
  });

  it("prefers a later year over a higher week number from an earlier year", () => {
    // Week numbers reset every January, so a naive max-week comparison would
    // wrongly pick "wk52" of 2025 over "wk05" of 2026.
    const html = `
      <a href="https://documents.pse.com.ph/wp-content/uploads/sites/15/2025/12/wk52_dec2025mktwatch.pdf">Week 52</a>
      <a href="https://documents.pse.com.ph/wp-content/uploads/sites/15/2026/01/wk05_jan2026mktwatch.pdf">Week 5</a>
    `;
    expect(latestMarketWatchLink(html)).toBe(
      "https://documents.pse.com.ph/wp-content/uploads/sites/15/2026/01/wk05_jan2026mktwatch.pdf"
    );
  });
});
