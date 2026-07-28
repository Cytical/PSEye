import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchWikipediaSummary } from "./wikipediaSummary";

/** Mirrors the real shape of en.wikipedia.org/api/rest_v1/page/summary/Banco_de_Oro
 * (verified live) — BDO Unibank, Inc.'s article is titled "Banco de Oro", not
 * its legal name, which is exactly the case a title-string-match check would
 * wrongly reject. */
const BDO_SUMMARY = {
  type: "standard",
  title: "Banco de Oro",
  extract: "BDO Unibank, Inc., commonly known as Banco de Oro (BDO), is a Philippine banking company.",
  wikibase_item: "Q4854129",
  content_urls: { desktop: { page: "https://en.wikipedia.org/wiki/Banco_de_Oro" } },
};

/** Mirrors wikidata.org's wbgetentities response shape — P31 (instance of)
 * includes Q4830453 (business) and Q891723 (public company) for BDO, verified live. */
const BDO_WIKIDATA = {
  entities: {
    Q4854129: {
      claims: {
        P31: [
          { mainsnak: { datavalue: { value: { id: "Q568041" } } } },
          { mainsnak: { datavalue: { value: { id: "Q4830453" } } } },
          { mainsnak: { datavalue: { value: { id: "Q891723" } } } },
        ],
      },
    },
  },
};

function jsonResponse(body: unknown, ok = true) {
  return { ok, json: async () => body };
}

describe("fetchWikipediaSummary", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("accepts a match whose article title differs from the company's legal name, confirmed via Wikidata", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("wikidata.org")) return jsonResponse(BDO_WIKIDATA);
      return jsonResponse(BDO_SUMMARY);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchWikipediaSummary("BDO Unibank, Inc.");
    expect(result).toEqual({
      title: "Banco de Oro",
      summary: BDO_SUMMARY.extract,
      url: "https://en.wikipedia.org/wiki/Banco_de_Oro",
    });
  });

  it("rejects a resolved page when Wikidata doesn't confirm it's a business", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("wikidata.org")) {
        return jsonResponse({ entities: { Q1: { claims: { P31: [{ mainsnak: { datavalue: { value: { id: "Q5" } } } }] } } } }); // Q5 = human
      }
      return jsonResponse({ ...BDO_SUMMARY, wikibase_item: "Q1" });
    });
    vi.stubGlobal("fetch", fetchMock);

    expect(await fetchWikipediaSummary("Some Person's Name Corp")).toBeNull();
  });

  it("rejects a disambiguation page without even checking Wikidata", async () => {
    // No "Inc./Corp./..." suffix to strip, so there's only one candidate to try.
    const fetchMock = vi.fn(async () => jsonResponse({ type: "disambiguation", title: "Ambiguous Holdings", extract: "" }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchWikipediaSummary("Ambiguous Holdings");
    expect(result).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1); // only the summary lookup, never wikidata
  });

  it("returns null when the exact name 404s, then tries the legal-suffix-stripped name", async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("wikidata.org")) return jsonResponse(BDO_WIKIDATA);
      if (decodeURIComponent(url).includes("Some_Obscure_Holding_Corp")) return jsonResponse({}, false);
      if (decodeURIComponent(url).includes("Some_Obscure_Holding")) return jsonResponse(BDO_SUMMARY);
      return jsonResponse({}, false);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchWikipediaSummary("Some Obscure Holding Corp");
    expect(result?.title).toBe("Banco de Oro");
  });

  it("returns null (never throws) when nothing resolves at all", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({}, false));
    vi.stubGlobal("fetch", fetchMock);

    expect(await fetchWikipediaSummary("Definitely Not A Real Company Inc.")).toBeNull();
  });
});
