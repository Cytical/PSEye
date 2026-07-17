import type { IndexForeignFlow } from "@pseye/source-foreign-flow";
import { parseMarketWatchPdf } from "./parseMarketWatchPdf";

const USER_AGENT =
  "Mozilla/5.0 (compatible; PSEyeBot/1.0; +https://github.com/pseye) fetching public weekly market report PDFs";

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
      const res = await fetch(REPORT_PAGE_URL, { headers: { "User-Agent": USER_AGENT } });
      if (!res.ok) {
        console.error(`PseMarketWatchForeignFlowSource: market-report page returned HTTP ${res.status}`);
        return null;
      }
      const html = await res.text();
      return latestMarketWatchLink(html);
    } catch (err) {
      console.error("PseMarketWatchForeignFlowSource: market-report page fetch failed", err);
      return null;
    }
  }

  private async fetchPdf(url: string): Promise<Uint8Array | null> {
    try {
      const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
      if (!res.ok) {
        console.error(`PseMarketWatchForeignFlowSource: PDF fetch returned HTTP ${res.status} for ${url}`);
        return null;
      }
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
