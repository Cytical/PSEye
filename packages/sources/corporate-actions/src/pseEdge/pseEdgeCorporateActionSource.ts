import type { CorporateAction, CorporateActionSource } from "../types";
import { parseDividendsHtml, parseTotalPages } from "./parseDividends";

const USER_AGENT =
  "Mozilla/5.0 (compatible; PSEyeBot/1.0; +https://github.com/pseye) fetching public dividend listings";

const LIST_URL = "https://edge.pse.com.ph/disclosureData/dividends_and_rights_info_list.ax?DividendsOrRights=Dividends";

/**
 * Real CorporateActionSource: POSTs to PSE Edge's "Dividends and Rights"
 * page's own `.ax` endpoint (paginated, ~50 rows/page, sorted by date
 * descending) and parses cash/stock/property dividend declarations. Only
 * rows for PSE_EDGE_COMPANIES tickers with fully-parseable dates survive.
 * Same legal tradeoff as PseEdgeQuoteSource — see docs/PLANNING.md.
 *
 * Not covered yet: the "Rights" tab (same endpoint,
 * `?DividendsOrRights=Rights`) — at time of writing it's ~11 rows, most with
 * "TBA" ex-date/record date PSE Edge hasn't scheduled yet, so there wasn't
 * enough clean, dated data to justify the mapping. Swap/extend via this
 * class, not by editing callers.
 */
export class PseEdgeCorporateActionSource implements CorporateActionSource {
  constructor(
    private readonly requestDelayMs = 300,
    private readonly maxPages = 15
  ) {}

  async getUpcoming(): Promise<CorporateAction[]> {
    const results: CorporateAction[] = [];

    let page = 1;
    let totalPages = 1;
    while (page <= Math.min(totalPages, this.maxPages)) {
      const html = await this.fetchPage(page);
      if (!html) break;

      results.push(...parseDividendsHtml(html));
      totalPages = parseTotalPages(html) ?? totalPages;
      page += 1;
      if (page <= Math.min(totalPages, this.maxPages)) await sleep(this.requestDelayMs);
    }

    return dedupe(withinWindow(results));
  }

  private async fetchPage(pageNum: number): Promise<string | null> {
    try {
      const res = await fetch(LIST_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": USER_AGENT,
          Referer: "https://edge.pse.com.ph/disclosureData/dividends_and_rights_info_form.do",
        },
        body: new URLSearchParams({
          pageNum: String(pageNum),
          sortMode: "date",
          dateSortType: "DESC",
          cmpySortType: "ASC",
        }),
      });
      if (!res.ok) {
        console.error(`PseEdgeCorporateActionSource: page ${pageNum} returned HTTP ${res.status}`);
        return null;
      }
      return await res.text();
    } catch (err) {
      console.error(`PseEdgeCorporateActionSource: page ${pageNum} fetch failed`, err);
      return null;
    }
  }
}

/** Keeps the calendar focused on what's actionable: recently-passed through the next ~6 months. */
function withinWindow(actions: CorporateAction[]): CorporateAction[] {
  const today = new Date().toISOString().slice(0, 10);
  const windowStart = addDays(today, -14);
  const windowEnd = addDays(today, 183);
  return actions.filter((a) => a.exDate >= windowStart && a.exDate <= windowEnd);
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function dedupe(actions: CorporateAction[]): CorporateAction[] {
  const seen = new Set<string>();
  return actions.filter((a) => {
    const key = `${a.ticker}|${a.type}|${a.exDate}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
