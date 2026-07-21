import { afterEach, describe, expect, it, vi } from "vitest";
import { PseEdgeQuoteSource } from "./pseEdgeQuoteSource";
import { PSE_EDGE_COMPANIES } from "./pseEdgeCompanyDirectory";

const stockDataHtml = (price: string, changeCell: string, marketCap: string) => `
<table class="view">
<tr><th>Status</th><td>Active</td><th>Market Capitalization</th><td>${marketCap}</td></tr>
</table>
<table class="view">
<tr>
  <th>Last Traded Price</th><td>${price}</td>
  <th>Open</th><td></td>
  <th>Previous Close and Date</th><td></td>
</tr>
<tr>
  <th>Change(% Change)</th><td>${changeCell}</td>
  <th>High</th><td></td>
  <th>P/E Ratio</th><td></td>
</tr>
</table>
`;

describe("PseEdgeQuoteSource", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("fetches every tracked company and maps ticker/sector/companyName from the static roster", async () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => ({
      ok: true,
      text: async () => stockDataHtml("100.00", "up&nbsp; 1.00 (1.00%)", "1,000,000.00"),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const source = new PseEdgeQuoteSource(0);
    const quotes = await source.getDailyQuotes();

    expect(quotes).toHaveLength(PSE_EDGE_COMPANIES.length);
    expect(fetchMock).toHaveBeenCalledTimes(PSE_EDGE_COMPANIES.length);

    const bdo = quotes.find((q) => q.ticker === "BDO");
    expect(bdo).toMatchObject({
      companyName: PSE_EDGE_COMPANIES.find((c) => c.ticker === "BDO")!.companyName,
      sector: "Financials",
      price: 100,
      pctChange: 1,
      marketCap: 1_000_000,
    });

    const requestInit = fetchMock.mock.calls[0]?.[1] as RequestInit | undefined;
    expect(requestInit?.headers).toMatchObject({ "User-Agent": expect.stringContaining("PSEyeBot") });
  });

  it("reports a quote with null price/pctChange instead of throwing when a request fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500, text: async () => "" }))
    );

    const source = new PseEdgeQuoteSource(0);
    const quotes = await source.getDailyQuotes();

    expect(quotes).toHaveLength(PSE_EDGE_COMPANIES.length);
    for (const quote of quotes) {
      expect(quote.price).toBeNull();
      expect(quote.pctChange).toBeNull();
    }
  });

  it("reports a quote with null price/pctChange instead of throwing on a network error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      })
    );

    const source = new PseEdgeQuoteSource(0);
    const quotes = await source.getDailyQuotes();

    expect(quotes[0].price).toBeNull();
    expect(quotes[0].pctChange).toBeNull();
    expect(quotes[0].marketCap).toBe(0);
  });

  it("getDailyQuotesWithStatus flags a failed request as fetchFailed, distinct from a legitimate no-trade null", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: false, status: 500, text: async () => "" }))
    );

    const source = new PseEdgeQuoteSource(0);
    const results = await source.getDailyQuotesWithStatus();

    expect(results).toHaveLength(PSE_EDGE_COMPANIES.length);
    for (const result of results) {
      expect(result.fetchFailed).toBe(true);
      expect(result.quote.price).toBeNull();
    }
  });

  it("getDailyQuotesWithStatus does not flag a successful response reporting no trade as fetchFailed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        text: async () => stockDataHtml("", "", "1,000,000.00"),
      }))
    );

    const source = new PseEdgeQuoteSource(0);
    const results = await source.getDailyQuotesWithStatus();

    const bdo = results.find((r) => r.quote.ticker === "BDO");
    expect(bdo?.fetchFailed).toBe(false);
    expect(bdo?.quote.price).toBeNull();
  });
});
