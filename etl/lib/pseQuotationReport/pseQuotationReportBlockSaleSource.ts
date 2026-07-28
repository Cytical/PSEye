import { fetchWithRetry } from "../fetchWithRetry";
import {
  parseQuotationReportPdf,
  parseQuotationReportForeignFlow,
  type BlockSaleRow,
  type StockForeignFlowRow,
} from "./parseQuotationReportPdf";

const USER_AGENT =
  "Mozilla/5.0 (compatible; PSEyeBot/1.0; +https://github.com/pseye) fetching public daily EOD report PDFs";

/**
 * pse.com.ph's WAF 500s a request with no `Accept` header at all, regardless
 * of User-Agent (confirmed live: identical Chrome UA got 500 without this
 * header, 200 with it) — every fetch here needs it, not just a realistic UA.
 */
const REQUEST_HEADERS = { "User-Agent": USER_AGENT, Accept: "text/html,application/pdf,*/*" };

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export interface BlockSalesReport {
  tradeDate: string; // YYYY-MM-DD
  rows: BlockSaleRow[];
  stockForeignFlow: StockForeignFlowRow[];
}

/**
 * Fetches PSE's free daily "Daily Quotation Report" ("End of Day Quotes" on
 * pse.com.ph/market-report/) and extracts the latest trading day's BLOCK
 * SALES table *and* per-stock Net Foreign Buying/(Selling) figures (see
 * parseQuotationReportPdf.ts for why both need position-based PDF parsing,
 * and for why per-stock foreign flow lives in the same report). Both are
 * parsed from one PDF fetch — pse.com.ph's WAF is already flaky enough
 * without a second request for data that's sitting in the same file.
 *
 * The report has no per-row trade date (one PDF = one trading day), so the
 * date comes from the filename, not the table itself.
 *
 * 2026-07-28: switched from scraping the market-report page's HTML for the
 * link to constructing the PDF URL directly from the trade date. That page
 * now populates its report table via a client-side AJAX call (WordPress
 * "Posts Table Pro"), so a plain HTTP GET — no JS execution — sees an empty
 * table shell and never finds a link; confirmed live (a bare fetch of the
 * page has zero occurrences of "-EOD.pdf" in the response body, while a real
 * browser resolves the row within ~3s of load). Unlike the weekly Market
 * Watch PDF's unpredictable week number, this report's filename is fully
 * determined by the trade date (`<Month> <DD>, <YYYY>-EOD.pdf`, day always
 * zero-padded — confirmed live both ways, "July 1" 404s, "July 01" 200s), so
 * there's nothing to discover: this builds the URL for Manila "today" and
 * walks backward a few calendar days (skipping to the most recent day that
 * exists) to cover weekends, holidays, and late publication without needing
 * to know PSE's trading calendar.
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

    // pdf.js's getDocument() transfers (detaches) the underlying buffer on
    // use — confirmed live, a second getDocument({ data: pdfBytes }) call on
    // the same Uint8Array throws "Unable to deserialize cloned data" even
    // when awaited sequentially, not just under Promise.all. Each parse needs
    // its own copy of the bytes.
    const rows = await parseQuotationReportPdf(pdfBytes.slice());
    const stockForeignFlow = await parseQuotationReportForeignFlow(pdfBytes.slice());
    return { tradeDate: found.tradeDate, rows, stockForeignFlow };
  }

  private async findLatestReportUrl(): Promise<{ url: string; tradeDate: string } | null> {
    const manilaParts = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Manila",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const get = (type: string) => Number(manilaParts.find((p) => p.type === type)?.value);
    const todayUtcMidnight = Date.UTC(get("year"), get("month") - 1, get("day"));

    // Walk back up to 7 calendar days — covers weekends and the rare holiday
    // or late-publication day without needing PSE's trading calendar.
    for (let i = 0; i < 7; i++) {
      const d = new Date(todayUtcMidnight - i * 86_400_000);
      const candidate = quotationReportUrlForDate(d);
      if (await this.reportExists(candidate.url)) return candidate;
    }
    return null;
  }

  /**
   * A plain HEAD, not fetchWithRetry — a 404 here just means this candidate
   * calendar day never had a report (weekend/holiday), which is the expected
   * outcome for most of the backward walk, not the WAF flakiness
   * fetchWithRetry exists to paper over. Retrying a real 404 four times per
   * candidate day would needlessly hammer the server on every non-trading
   * day in the lookback window.
   */
  private async reportExists(url: string): Promise<boolean> {
    try {
      const res = await fetch(url, { method: "HEAD", headers: REQUEST_HEADERS });
      return res.ok;
    } catch (err) {
      console.error(`PseQuotationReportBlockSaleSource: HEAD check failed for ${url}`, err);
      return false;
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

/** Builds the deterministic report URL/trade-date pair for one UTC-midnight-normalized date. */
export function quotationReportUrlForDate(d: Date): { url: string; tradeDate: string } {
  const monthName = MONTH_NAMES[d.getUTCMonth()];
  const day = String(d.getUTCDate()).padStart(2, "0");
  const year = d.getUTCFullYear();
  const url = `https://documents.pse.com.ph/market_report/${monthName}%20${day},%20${year}-EOD.pdf`;
  const tradeDate = `${year}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${day}`;
  return { url, tradeDate };
}
