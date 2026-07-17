import { fetchWithRetry } from "../fetchWithRetry";
import { parseQuotationReportPdf, type BlockSaleRow } from "./parseQuotationReportPdf";

const USER_AGENT =
  "Mozilla/5.0 (compatible; PSEyeBot/1.0; +https://github.com/pseye) fetching public daily EOD report PDFs";

/**
 * pse.com.ph's WAF 500s a request with no `Accept` header at all, regardless
 * of User-Agent (confirmed live: identical Chrome UA got 500 without this
 * header, 200 with it) — every fetch here needs it, not just a realistic UA.
 */
const REQUEST_HEADERS = { "User-Agent": USER_AGENT, Accept: "text/html,application/pdf,*/*" };

const REPORT_PAGE_URL = "https://www.pse.com.ph/market-report/";

const MONTHS: Record<string, number> = {
  January: 0, February: 1, March: 2, April: 3, May: 4, June: 5,
  July: 6, August: 7, September: 8, October: 9, November: 10, December: 11,
};

export interface BlockSalesReport {
  tradeDate: string; // YYYY-MM-DD
  rows: BlockSaleRow[];
}

/**
 * Fetches PSE's free daily "Daily Quotation Report" ("End of Day Quotes" on
 * pse.com.ph/market-report/) and extracts the latest trading day's BLOCK
 * SALES table (see parseQuotationReportPdf.ts for why this needs
 * position-based PDF parsing). The report's own filename encodes the date
 * (`Month D, YYYY-EOD.pdf`, e.g. "June 30, 2026-EOD.pdf"), but that date
 * isn't predictable in advance (PSE doesn't publish on weekends/holidays,
 * and publication can lag by a day) — so this discovers the link from the
 * market-report page's own HTML instead of guessing a URL, same approach as
 * PseMarketWatchForeignFlowSource.
 *
 * The report has no per-row trade date (one PDF = one trading day), so the
 * date comes from the filename, not the table itself.
 *
 * Only returns the single latest trading day (not a deep backfill). Meant
 * for a daily-cadence ETL job (etl/jobs/fetch-block-sales.ts); the DB
 * accumulates real history one day at a time as that job keeps running,
 * same principle as every other real *Source here.
 */
export class PseQuotationReportBlockSaleSource {
  async getLatest(): Promise<BlockSalesReport | null> {
    const found = await this.findLatestReportUrl();
    if (!found) return null;

    const pdfBytes = await this.fetchPdf(found.url);
    if (!pdfBytes) return null;

    const rows = await parseQuotationReportPdf(pdfBytes);
    return { tradeDate: found.tradeDate, rows };
  }

  private async findLatestReportUrl(): Promise<{ url: string; tradeDate: string } | null> {
    try {
      const res = await fetchWithRetry(REPORT_PAGE_URL, { headers: REQUEST_HEADERS });
      if (!res) return null;
      const html = await res.text();
      return latestQuotationReportLink(html);
    } catch (err) {
      console.error("PseQuotationReportBlockSaleSource: market-report page fetch failed", err);
      return null;
    }
  }

  private async fetchPdf(url: string): Promise<Uint8Array | null> {
    try {
      const res = await fetchWithRetry(url, { headers: REQUEST_HEADERS });
      if (!res) return null;
      return new Uint8Array(await res.arrayBuffer());
    } catch (err) {
      console.error(`PseQuotationReportBlockSaleSource: PDF fetch failed for ${url}`, err);
      return null;
    }
  }
}

/**
 * Picks the newest `.../market_report/<Month> <D>, <YYYY>-EOD.pdf` link on
 * the market-report page — the page lists many months of history, newest
 * and oldest mixed together (same reason latestMarketWatchLink can't just
 * take "the last link on the page").
 */
export function latestQuotationReportLink(html: string): { url: string; tradeDate: string } | null {
  const matches = [
    ...html.matchAll(
      /href="(https:\/\/documents\.pse\.com\.ph\/market_report\/([A-Za-z]+) (\d{1,2}), (\d{4})-EOD\.pdf)"/g
    ),
  ];
  if (matches.length === 0) return null;

  let best: { url: string; tradeDate: string; time: number } | null = null;
  for (const m of matches) {
    const month = MONTHS[m[2]];
    if (month === undefined) continue;
    const day = Number(m[3]);
    const year = Number(m[4]);
    const time = Date.UTC(year, month, day);
    if (!best || time > best.time) {
      best = { url: m[1], tradeDate: new Date(time).toISOString().slice(0, 10), time };
    }
  }
  return best ? { url: best.url, tradeDate: best.tradeDate } : null;
}
