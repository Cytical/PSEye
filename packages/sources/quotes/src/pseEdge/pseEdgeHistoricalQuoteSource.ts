import type { HistoricalClose, HistoricalQuoteSource } from "../types";
import { PSE_EDGE_COMPANIES } from "./pseEdgeCompanyDirectory";
import { parseChartDataJson, parseSecurityId } from "./parseChartData";

const USER_AGENT =
  "Mozilla/5.0 (compatible; PSEyeBot/1.0; +https://github.com/pseye) fetching public EOD/delayed stock data pages";

/**
 * Real HistoricalQuoteSource: PSE Edge's own per-company "Stock Data" page
 * draws its price chart from `/common/DisclosureCht.ax`, a JSON endpoint
 * taking `{cmpy_id, security_id, startDate, endDate}` (MM-DD-YYYY) and
 * returning real daily OPEN/HIGH/LOW/CLOSE/VALUE. `security_id` isn't in our
 * static PSE_EDGE_COMPANIES roster (that only resolved `cmpy_id`), so each
 * call first fetches stockData.do once to read it off that page's own
 * security dropdown, then fetches the chart data — two requests per ticker.
 * Same legal tradeoff as PseEdgeQuoteSource, see docs/PLANNING.md.
 *
 * This does real HTTP per call, so it belongs behind a scheduled batch job
 * writing to the DB (see etl/jobs/fetch-historical-quotes.ts), never called
 * directly from a browser — same reasoning as every other PSE Edge source.
 */
export class PseEdgeHistoricalQuoteSource implements HistoricalQuoteSource {
  constructor(private readonly requestDelayMs = 200) {}

  async getHistory(ticker: string, fromDate: string): Promise<HistoricalClose[]> {
    const company = PSE_EDGE_COMPANIES.find((c) => c.ticker === ticker);
    if (!company) return [];

    const securityId = await this.fetchSecurityId(company.cmpyId);
    if (!securityId) return [];
    await sleep(this.requestDelayMs);

    const toDate = new Date().toISOString().slice(0, 10);
    const json = await this.fetchChartJson(company.cmpyId, securityId, fromDate, toDate);
    if (!json) return [];

    return parseChartDataJson(json).filter((h) => h.date >= fromDate);
  }

  private async fetchSecurityId(cmpyId: string): Promise<string | null> {
    try {
      const res = await fetch(`https://edge.pse.com.ph/companyPage/stockData.do?cmpy_id=${cmpyId}`, {
        headers: { "User-Agent": USER_AGENT },
      });
      if (!res.ok) {
        console.error(`PseEdgeHistoricalQuoteSource: stockData.do cmpy_id=${cmpyId} returned HTTP ${res.status}`);
        return null;
      }
      return parseSecurityId(await res.text());
    } catch (err) {
      console.error(`PseEdgeHistoricalQuoteSource: stockData.do cmpy_id=${cmpyId} fetch failed`, err);
      return null;
    }
  }

  private async fetchChartJson(
    cmpyId: string,
    securityId: string,
    fromDate: string,
    toDate: string
  ): Promise<string | null> {
    try {
      const res = await fetch("https://edge.pse.com.ph/common/DisclosureCht.ax", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": USER_AGENT,
          Referer: `https://edge.pse.com.ph/companyPage/stockData.do?cmpy_id=${cmpyId}`,
        },
        body: JSON.stringify({
          cmpy_id: cmpyId,
          security_id: securityId,
          startDate: toMmDdYyyy(fromDate),
          endDate: toMmDdYyyy(toDate),
        }),
      });
      if (!res.ok) {
        console.error(`PseEdgeHistoricalQuoteSource: DisclosureCht.ax cmpy_id=${cmpyId} returned HTTP ${res.status}`);
        return null;
      }
      return await res.text();
    } catch (err) {
      console.error(`PseEdgeHistoricalQuoteSource: DisclosureCht.ax cmpy_id=${cmpyId} fetch failed`, err);
      return null;
    }
  }
}

function toMmDdYyyy(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${m}-${d}-${y}`;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
