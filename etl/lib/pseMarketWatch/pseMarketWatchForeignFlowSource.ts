import type { IndexForeignFlow } from "@pseye/source-foreign-flow";
import { fetchWithRetry } from "../fetchWithRetry";
import { parseMarketWatchPdf } from "./parseMarketWatchPdf";

const USER_AGENT =
  "Mozilla/5.0 (compatible; PSEyeBot/1.0; +https://github.com/pseye) fetching public weekly market report PDFs";

/**
 * pse.com.ph's WAF 500s a request with no `Accept` header at all, regardless
 * of User-Agent (confirmed live: identical Chrome UA got 500 without this
 * header, 200 with it) — every fetch here needs it, not just a realistic UA.
 */
const REQUEST_HEADERS = { "User-Agent": USER_AGENT, Accept: "text/html,application/pdf,*/*" };

const REPORT_PAGE_URL = "https://www.pse.com.ph/market-report/";

/**
 * Fetches PSE's free weekly "Market Watch" PDF and extracts the latest
 * week's index-level foreign buying/selling (see parseMarketWatchPdf.ts for
 * why this needs position-based PDF parsing rather than a simple text
 * regex). The PDF's own filename encodes the week/month/year
 * (`wkNN_monYYYYmktwatch.pdf`), which isn't predictable without already
 * knowing the current ISO week PSE assigns — so this discovers the link
 * from the market-report page's own HTML instead of guessing a URL.
 *
 * Only returns the single latest period (not a deep history — see
 * docs/PLANNING.md and this file's doc comment). Meant for a weekly-cadence
 * ETL job (see etl/jobs/fetch-foreign-flow.ts); the DB accumulates real
 * history one week at a time as that job keeps running, same principle as
 * every other real *Source here.
 */
export class PseMarketWatchForeignFlowSource {
  async getLatestIndexFlow(): Promise<IndexForeignFlow | null> {
    const pdfUrl = await this.findLatestMarketWatchUrl();
    if (!pdfUrl) return null;

    const pdfBytes = await this.fetchPdf(pdfUrl);
    if (!pdfBytes) return null;

    return parseMarketWatchPdf(pdfBytes);
  }

  private async findLatestMarketWatchUrl(): Promise<string | null> {
    try {
      const res = await fetchWithRetry(REPORT_PAGE_URL, { headers: REQUEST_HEADERS });
      if (!res) return null;
      const html = await res.text();
      return latestMarketWatchLink(html);
    } catch (err) {
      console.error("PseMarketWatchForeignFlowSource: market-report page fetch failed", err);
      return null;
    }
  }

  private async fetchPdf(url: string): Promise<Uint8Array | null> {
    try {
      const res = await fetchWithRetry(url, { headers: REQUEST_HEADERS });
      if (!res) return null;
      return new Uint8Array(await res.arrayBuffer());
    } catch (err) {
      console.error(`PseMarketWatchForeignFlowSource: PDF fetch failed for ${url}`, err);
      return null;
    }
  }
}

/**
 * Picks the (year, week) - latest among `.../<year>/<month>/wkNN_...mktwatch.pdf`
 * links on the market-report page — the page lists many months of history,
 * newest and oldest mixed together, so "last link on the page" isn't
 * reliable. The week number alone isn't enough either: it resets every
 * January, so a week-only comparison would wrongly favor "wk52" from last
 * December over "wk05" from this January. The year folder in the URL path
 * disambiguates that.
 */
export function latestMarketWatchLink(html: string): string | null {
  const matches = [
    ...html.matchAll(/href="(https:\/\/documents\.pse\.com\.ph\/[^"]*\/(\d{4})\/\d{2}\/wk(\d+)_[^"]*mktwatch\.pdf)"/gi),
  ];
  if (matches.length === 0) return null;

  let best: { url: string; year: number; week: number } | null = null;
  for (const m of matches) {
    const year = Number(m[2]);
    const week = Number(m[3]);
    if (!best || year > best.year || (year === best.year && week > best.week)) {
      best = { url: m[1], year, week };
    }
  }
  return best?.url ?? null;
}
