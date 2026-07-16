import type { Disclosure, DisclosureSource } from "../types";
import { parseAnnouncementsHtml, parseTotalPages } from "./parseAnnouncements";

const USER_AGENT =
  "Mozilla/5.0 (compatible; PSEyeBot/1.0; +https://github.com/pseye) fetching public disclosure listings";

const SEARCH_URL = "https://edge.pse.com.ph/announcements/search.ax";

/**
 * Real DisclosureSource: POSTs to PSE Edge's `/announcements/search.ax` —
 * the same endpoint the announcements page's own search button calls via
 * jQuery (`$.post(url, formData)`, see that site's epCommon.js `searchList`)
 * — and parses the returned HTML fragment (~50 rows/page). Only rows for
 * companies in PSE_EDGE_COMPANIES survive (see parseAnnouncementsHtml). This
 * is PSE Edge's own public filing stream, distilled — same legal tradeoff as
 * PseEdgeQuoteSource, see docs/PLANNING.md's data-source notes.
 *
 * Not covered yet: the "headline" is just PSE Edge's own filing-category
 * name (e.g. "Material Information/Transactions"), not a real description of
 * what was filed — getting that would mean also fetching each filing's
 * detail popup (`openPopup(<hex key>)`), an N+1 fetch this pass didn't take on.
 */
export class PseEdgeDisclosureSource implements DisclosureSource {
  constructor(
    private readonly lookbackDays = 2,
    private readonly requestDelayMs = 300,
    private readonly maxPages = 5
  ) {}

  async getRecent(): Promise<Disclosure[]> {
    const { fromDate, toDate } = dateRange(this.lookbackDays);
    const results: Disclosure[] = [];

    let page = 1;
    let totalPages = 1;
    while (page <= Math.min(totalPages, this.maxPages)) {
      const html = await this.fetchPage(fromDate, toDate, page);
      if (!html) break;

      results.push(...parseAnnouncementsHtml(html));
      totalPages = parseTotalPages(html) ?? totalPages;
      page += 1;
      if (page <= Math.min(totalPages, this.maxPages)) await sleep(this.requestDelayMs);
    }

    return results;
  }

  private async fetchPage(fromDate: string, toDate: string, pageNo: number): Promise<string | null> {
    try {
      const res = await fetch(SEARCH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": USER_AGENT,
          Referer: "https://edge.pse.com.ph/announcements/form.do",
        },
        body: new URLSearchParams({
          pageNo: String(pageNo),
          companyId: "",
          keyword: "",
          tmplNm: "",
          fromDate,
          toDate,
          sortType: "",
          dateSortType: "DESC",
          cmpySortType: "",
        }),
      });
      if (!res.ok) {
        console.error(`PseEdgeDisclosureSource: search.ax page ${pageNo} returned HTTP ${res.status}`);
        return null;
      }
      return await res.text();
    } catch (err) {
      console.error(`PseEdgeDisclosureSource: search.ax page ${pageNo} fetch failed`, err);
      return null;
    }
  }
}

/** PSE Edge's date inputs want MM-DD-YYYY. */
function dateRange(lookbackDays: number): { fromDate: string; toDate: string } {
  const fmt = (d: Date) =>
    `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}-${d.getFullYear()}`;
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - lookbackDays);
  return { fromDate: fmt(from), toDate: fmt(to) };
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
