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
    return (await this.getDailyQuotesWithStatus()).map((r) => r.quote);
  }

  /**
   * Same data as getDailyQuotes(), but each row also says whether *our* request
   * for that ticker failed this run (network error, non-2xx) as opposed to PSE
   * Edge responding normally with no trade to report (suspended ticker, no fill
   * yet today — a legitimate null, not a failure). Only fetch-quotes.ts (the ETL
   * job) needs this distinction, to avoid a transient scrape hiccup overwriting
   * a ticker's real price with a spurious null for the rest of the day.
   */
  async getDailyQuotesWithStatus(): Promise<Array<{ quote: Quote; fetchFailed: boolean }>> {
    const results: Array<{ quote: Quote; fetchFailed: boolean }> = [];

    for (const company of PSE_EDGE_COMPANIES) {
      const outcome = await this.fetchOne(company.cmpyId);
      results.push({
        quote: {
          ticker: company.ticker,
          companyName: company.companyName,
          sector: company.sector,
          price: outcome.parsed?.price ?? null,
          pctChange: outcome.parsed?.pctChange ?? null,
          marketCap: outcome.parsed?.marketCap ?? 0,
          freeFloatPct: outcome.parsed?.freeFloatPct ?? null,
          volume: outcome.parsed?.volume ?? null,
          value: outcome.parsed?.value ?? null,
        },
        fetchFailed: outcome.failed,
      });
      await sleep(this.requestDelayMs);
    }

    return results;
  }

  private async fetchOne(
    cmpyId: string
  ): Promise<{ parsed: ReturnType<typeof parseStockDataHtml> | null; failed: boolean }> {
    try {
      const res = await fetch(`https://edge.pse.com.ph/companyPage/stockData.do?cmpy_id=${cmpyId}`, {
        headers: { "User-Agent": USER_AGENT },
      });
      if (!res.ok) {
        console.error(`PseEdgeQuoteSource: cmpy_id=${cmpyId} returned HTTP ${res.status}`);
        return { parsed: null, failed: true };
      }
      return { parsed: parseStockDataHtml(await res.text()), failed: false };
    } catch (err) {
      console.error(`PseEdgeQuoteSource: cmpy_id=${cmpyId} fetch failed`, err);
      return { parsed: null, failed: true };
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
