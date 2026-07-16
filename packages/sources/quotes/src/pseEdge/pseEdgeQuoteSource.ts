import type { Quote, QuoteSource } from "../types";
import { PSE_EDGE_COMPANIES } from "./pseEdgeCompanyDirectory";
import { parseStockDataHtml } from "./parseStockData";

const USER_AGENT =
  "Mozilla/5.0 (compatible; PSEyeBot/1.0; +https://github.com/pseye) fetching public EOD/delayed stock data pages";

/**
 * Real QuoteSource: scrapes PSE Edge's public per-company "Stock Data" page
 * (`edge.pse.com.ph/companyPage/stockData.do?cmpy_id=...`) once per tracked
 * ticker. Requests run sequentially with a delay between them — this is a
 * scheduled batch job (see etl/jobs/fetch-quotes.ts), not a per-user request,
 * so there is no reason to hit PSE Edge any harder or faster than a single
 * polite crawl requires. See docs/PLANNING.md's data-source notes: this is
 * delayed/EOD data read from a public page, not a licensed real-time feed.
 */
export class PseEdgeQuoteSource implements QuoteSource {
  constructor(private readonly requestDelayMs = 200) {}

  async getDailyQuotes(): Promise<Quote[]> {
    const quotes: Quote[] = [];

    for (const company of PSE_EDGE_COMPANIES) {
      const parsed = await this.fetchOne(company.cmpyId);
      quotes.push({
        ticker: company.ticker,
        companyName: company.companyName,
        sector: company.sector,
        price: parsed?.price ?? null,
        pctChange: parsed?.pctChange ?? null,
        marketCap: parsed?.marketCap ?? 0,
      });
      await sleep(this.requestDelayMs);
    }

    return quotes;
  }

  private async fetchOne(cmpyId: string) {
    try {
      const res = await fetch(`https://edge.pse.com.ph/companyPage/stockData.do?cmpy_id=${cmpyId}`, {
        headers: { "User-Agent": USER_AGENT },
      });
      if (!res.ok) {
        console.error(`PseEdgeQuoteSource: cmpy_id=${cmpyId} returned HTTP ${res.status}`);
        return null;
      }
      return parseStockDataHtml(await res.text());
    } catch (err) {
      console.error(`PseEdgeQuoteSource: cmpy_id=${cmpyId} fetch failed`, err);
      return null;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
