import type { IndexForeignFlow } from "@pseye/source-foreign-flow";
import { fetchWithRetry } from "../fetchWithRetry";
import { parseMarketWatchPdf } from "./parseMarketWatchPdf";

const USER_AGENT =
  "Mozilla/5.0 (compatible; PHMarketEyeBot/1.0; +https://github.com/Cytical/PSEye) fetching public weekly market report PDFs";

/**
 * pse.com.ph's WAF 500s a request with no `Accept` header at all, regardless
 * of User-Agent (confirmed live: identical Chrome UA got 500 without this
 * header, 200 with it) — every fetch here needs it, not just a realistic UA.
 */
const REQUEST_HEADERS = { "User-Agent": USER_AGENT, Accept: "text/html,application/pdf,*/*" };

const REPORT_PAGE_URL = "https://www.pse.com.ph/market-report/";

/**
 * The "Market Reports" table on `REPORT_PAGE_URL` moved to server-side
 * DataTables (the "Posts Table Pro" WP plugin) at some point after
 * 2026-07-17 — confirmed live: a plain fetch of the page's HTML now returns
 * zero report rows/links at all (the initial markup is just an empty
 * `<table>` shell; rows are injected by an AJAX call the browser fires after
 * load). This was caught because index_foreign_flow had been stuck on a
 * single periodEnd for weeks — fetch-foreign-flow.ts's job was "succeeding"
 * every day (getLatestIndexFlow returning null isn't treated as a failure,
 * see that job's doc comment) while silently never finding a newer PDF.
 *
 * Fix: call that same AJAX endpoint directly instead of scraping the static
 * page. Reverse-engineered from the plugin's own
 * `posts-table-pro.min.js` (`buildConfig`'s `e.ajax = {url, type: "POST",
 * data: {table_id, action, _ajax_nonce}}`) — POST to `/wp-admin/admin-ajax.php`
 * with `action=ptp_load_posts`, the page's `_ajax_nonce` (a short-lived
 * WordPress nonce, so it has to be read off a fresh page fetch each run, not
 * hardcoded), and the table's own `id` attribute (also read off the page;
 * unclear if it's stable long-term, so don't hardcode this either). The
 * response is JSON with one object per report row, each carrying a `content`
 * field containing that row's download-link HTML.
 *
 * Deliberately doesn't replicate DataTables' full server-side search
 * protocol (per-column `columns[i][search][value]` params) to filter to just
 * "Weekly Market Watch" rows server-side — attempted live and the plugin's
 * PHP handler didn't apply it (returned the same unfiltered result set
 * regardless), and the exact contract isn't documented anywhere public.
 * Simpler and more robust instead: fetch AJAX_PAGE_SIZE unfiltered rows
 * (newest first, the table's default order) — PSE publishes roughly 2 daily
 * reports/weekday, so even a few weeks of those still leaves plenty of room
 * for the ~1/week Market Watch report to appear in that window — concatenate
 * every row's `content` HTML, and reuse the same latestMarketWatchLink
 * regex this always used, since that part of the fix (the URL pattern
 * itself, and picking the highest (year, week)) was never broken.
 */
const AJAX_URL = "https://www.pse.com.ph/wp-admin/admin-ajax.php";
const AJAX_PAGE_SIZE = 60;

/**
 * Fetches PSE's free weekly "Market Watch" PDF and extracts the latest
 * week's index-level foreign buying/selling (see parseMarketWatchPdf.ts for
 * why this needs position-based PDF parsing rather than a simple text
 * regex). The PDF's own filename encodes the week/month/year
 * (`wkNN_monYYYYmktwatch.pdf`), which isn't predictable without already
 * knowing the current ISO week PSE assigns — so this discovers the link
 * from the market-report page's AJAX report feed instead of guessing a URL.
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
      const pageRes = await fetchWithRetry(REPORT_PAGE_URL, { headers: REQUEST_HEADERS });
      if (!pageRes) return null;
      const html = await pageRes.text();

      const nonce = html.match(/"ajax_nonce":"([a-f0-9]+)"/)?.[1];
      const tableId = html.match(/<table[^>]*\bid="(ptp_[a-f0-9_]+)"/)?.[1];
      if (!nonce || !tableId) {
        console.error("PseMarketWatchForeignFlowSource: couldn't find the report table's ajax_nonce/table id");
        return null;
      }

      const ajaxRes = await fetchWithRetry(AJAX_URL, {
        method: "POST",
        headers: { ...REQUEST_HEADERS, "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8" },
        body: new URLSearchParams({
          action: "ptp_load_posts",
          _ajax_nonce: nonce,
          table_id: tableId,
          draw: "1",
          start: "0",
          length: String(AJAX_PAGE_SIZE),
        }),
      });
      if (!ajaxRes) return null;

      const json = (await ajaxRes.json()) as { data?: { content?: string }[] };
      const combinedContent = (json.data ?? []).map((row) => row.content ?? "").join("\n");
      return latestMarketWatchLink(combinedContent);
    } catch (err) {
      console.error("PseMarketWatchForeignFlowSource: market-report table fetch failed", err);
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
 * links in the given HTML — the report feed mixes many months of history,
 * newest and oldest, so "last link" isn't reliable. The week number alone
 * isn't enough either: it resets every January, so a week-only comparison
 * would wrongly favor "wk52" from last December over "wk05" from this
 * January. The year folder in the URL path disambiguates that.
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
