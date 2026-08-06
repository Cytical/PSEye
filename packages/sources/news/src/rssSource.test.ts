import { describe, expect, it } from "vitest";
import { cleanAuthorName, parsePublishedAt, stripHtmlAndTruncate } from "./rssSource";

describe("cleanAuthorName", () => {
  const clean = (raw: string) => cleanAuthorName(raw, "Inquirer Business");

  it("keeps a real byline", () => {
    expect(clean("Chynna Grace Ong")).toBe("Chynna Grace Ong");
    expect(clean("Reynaldo Lugtu Jr.")).toBe("Reynaldo Lugtu Jr.");
  });

  it("keeps a wire service, which is a single capitalised token", () => {
    expect(clean("Reuters")).toBe("Reuters");
    expect(clean("Agence France-Presse")).toBe("Agence France-Presse");
  });

  it("rejects a CMS login, which is a single lowercase token", () => {
    // All three are live values from Inquirer's feed. "By jbarrion" is worse
    // than no byline, which is the whole reason this check exists.
    expect(clean("clopez")).toBeNull();
    expect(clean("jbarrion")).toBeNull();
    expect(clean("jcristobal")).toBeNull();
  });

  it("rejects CMS placeholders and junk", () => {
    expect(clean("NewsPublish")).toBeNull();
    expect(clean("admin")).toBeNull();
    expect(clean("___")).toBeNull();
    expect(clean("")).toBeNull();
    expect(clean("   ")).toBeNull();
  });

  it("rejects the outlet crediting itself", () => {
    expect(cleanAuthorName("Malaya Business Insight", "Malaya Business Insight")).toBeNull();
    expect(cleanAuthorName("malaya business insight", "Malaya Business Insight")).toBeNull();
  });

  it("fixes a carelessly typed all-lowercase name rather than dropping it", () => {
    expect(clean("christine fajardo")).toBe("Christine Fajardo");
  });

  it("spaces a co-byline the feed ran together", () => {
    expect(clean("Niña Myka Pauline Arceo,Allen Limos")).toBe("Niña Myka Pauline Arceo, Allen Limos");
  });

  it("unwraps the RSS 2.0 email-with-name convention", () => {
    expect(clean("news@example.com (Jane Cruz)")).toBe("Jane Cruz");
  });

  it("rejects something too long to be a byline", () => {
    expect(clean("A".repeat(200))).toBeNull();
  });
});

describe("stripHtmlAndTruncate", () => {
  it("returns null for nothing to show", () => {
    expect(stripHtmlAndTruncate(undefined)).toBeNull();
    expect(stripHtmlAndTruncate("")).toBeNull();
    expect(stripHtmlAndTruncate("   <p></p>  ")).toBeNull();
  });

  it("strips tags and collapses feed whitespace", () => {
    expect(stripHtmlAndTruncate("<p>Gold rose.</p>\n\n<p>Spot&nbsp;gold up 0.2%.</p>")).toBe(
      "Gold rose. Spot gold up 0.2%."
    );
  });

  it("leaves a complete sentence within the cap untouched, with no ellipsis", () => {
    const short = "The Philippines risks overtaxing its power grid.";
    expect(stripHtmlAndTruncate(short)).toBe(short);
    expect(stripHtmlAndTruncate("Will the grid hold?")).toBe("Will the grid hold?");
  });

  it("marks a short excerpt the outlet itself cut mid-sentence", () => {
    // Manila Bulletin's CMS ships a fixed-length excerpt with no terminator.
    // Unmarked, that reads as a typo rather than as an excerpt.
    expect(stripHtmlAndTruncate("Net income rose to P4.05 billion in the six months ending June, up")).toBe(
      "Net income rose to P4.05 billion in the six months ending June, up…"
    );
  });

  it("ends on a sentence when one is available near the cap", () => {
    // The old fixed-width cut is what produced stored snippets ending
    // "covering the Ju…" — this is the regression guard for that.
    const text = `${"word ".repeat(50)}That sentence ended here. ${"tail ".repeat(40)}`;
    const out = stripHtmlAndTruncate(text)!;
    expect(out.endsWith("That sentence ended here.")).toBe(true);
    expect(out).not.toContain("…");
  });

  it("falls back to a word boundary when no sentence ends near the cap", () => {
    const out = stripHtmlAndTruncate(`${"alpha ".repeat(200)}`)!;
    expect(out.endsWith("…")).toBe(true);
    expect(out.replace("…", "").endsWith("alpha")).toBe(true);
    expect(out.length).toBeLessThanOrEqual(341);
  });

  it("does not mistake a decimal point for the end of a sentence", () => {
    const text = `${"pad ".repeat(70)}Power prices eased to P8.31 per kilowatt hour in July across the whole grid`;
    const out = stripHtmlAndTruncate(text)!;
    expect(out.endsWith("P8.")).toBe(false);
  });

  it("does not mistake an initial for the end of a sentence", () => {
    const text = `${"pad ".repeat(69)}Ports magnate Enrique Razon Jr. claimed the top spot on the list this year`;
    const out = stripHtmlAndTruncate(text)!;
    expect(out.endsWith("Jr.")).toBe(false);
  });

  it("hard-slices a single unbroken token rather than returning nothing", () => {
    const out = stripHtmlAndTruncate("x".repeat(500))!;
    expect(out).toHaveLength(340);
    expect(out.endsWith("…")).toBe(true);
  });
});

describe("parsePublishedAt", () => {
  const NOW = new Date("2026-08-07T12:00:00Z").getTime();

  it("keeps a normal past date exactly as filed", () => {
    expect(parsePublishedAt("2026-08-07T09:30:00Z", NOW).toISOString()).toBe(
      "2026-08-07T09:30:00.000Z"
    );
  });

  it("clamps a future-stamped item to now", () => {
    // Inquirer Business really does stamp ahead, by up to three hours.
    // Unclamped, its stories monopolise anything sorted by recency.
    expect(parsePublishedAt("2026-08-07T15:00:00Z", NOW).getTime()).toBe(NOW);
  });

  it("falls back to now when the feed sends no date", () => {
    expect(parsePublishedAt(undefined, NOW).getTime()).toBe(NOW);
  });

  it("falls back to now rather than an Invalid Date", () => {
    expect(parsePublishedAt("not a date", NOW).getTime()).toBe(NOW);
  });
});
