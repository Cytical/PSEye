const USER_AGENT = "Mozilla/5.0 (compatible; PSEyeBot/1.0; +https://github.com/pseye) fetching a company's Wikipedia summary";

/** Confirmed live against Wikidata for several PSE-listed companies (banks,
 * conglomerates, a REIT) — Q4830453/Q783794/Q6881511 cover the general
 * "business"/"company"/"enterprise" cases, Q891723 catches publicly-listed
 * ones specifically, Q1616075/Q15911314 catch bank/financial-services
 * subtypes that don't also carry the broader "company" claim. */
const BUSINESS_QIDS = new Set([
  "Q4830453", // business
  "Q783794", // company
  "Q6881511", // enterprise
  "Q891723", // public company
  "Q1616075", // bank
  "Q15911314", // financial services company
  "Q43229", // organization (broad fallback)
]);

export interface WikipediaMatch {
  title: string;
  /** Wikipedia's own lead-paragraph extract, plain text (no wiki markup/HTML). */
  summary: string;
  url: string;
}

interface WikipediaSummaryResponse {
  type: string;
  title: string;
  extract: string;
  wikibase_item?: string;
  content_urls?: { desktop?: { page?: string } };
}

/** Strips the generic corporate-entity suffix a PSE_EDGE_COMPANIES companyName
 * almost always carries ("Inc.", "Corporation", ...) — NOT words like
 * "Holdings" or "Group" that are actually part of what distinguishes one
 * company's name from another. Used only as a second attempt when the
 * legal name (as PSE Edge has it) doesn't resolve on its own — e.g. "SM
 * Investments Corporation" has no exact Wikipedia title, "SM Investments"
 * does. */
function stripLegalSuffix(name: string): string {
  return name
    .replace(/,?\s*(Inc\.?|Incorporated|Corp\.?|Corporation|Co\.?|Ltd\.?|Limited|PLC)\.?\s*$/i, "")
    .trim();
}

async function fetchJson(url: string): Promise<unknown | null> {
  try {
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

/** True only if Wikidata's own P31 ("instance of") claims for this entity
 * include at least one business/company/organization type — the real
 * confidence gate, not string-matching the title. A company's Wikipedia
 * article is very often titled after its trade name rather than its full
 * legal name (BDO Unibank, Inc.'s article is titled "Banco de Oro"), so
 * requiring the title to match the query string rejects real, correct
 * matches; confirming the matched *entity* is actually a business does not. */
async function isConfirmedBusiness(wikibaseItem: string): Promise<boolean> {
  const data = (await fetchJson(
    `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${wikibaseItem}&props=claims&format=json`
  )) as { entities?: Record<string, { claims?: Record<string, { mainsnak?: { datavalue?: { value?: { id?: string } } } }[]> }> } | null;
  const claims = data?.entities?.[wikibaseItem]?.claims?.P31 ?? [];
  return claims.some((c) => {
    const id = c.mainsnak?.datavalue?.value?.id;
    return id != null && BUSINESS_QIDS.has(id);
  });
}

/**
 * Looks up a company's Wikipedia summary, accepting a match only when
 * Wikipedia resolves the query to a real (non-disambiguation) article AND
 * Wikidata confirms that article's subject is actually a business/company —
 * two independent signals, since PSE_EDGE_COMPANIES' companyName strings are
 * specific enough that a wrong-entity collision on the first alone would be
 * unusual but not impossible. Tries the exact legal name first, then a
 * suffix-stripped version if the first didn't resolve. Returns null (never a
 * guess) when no confident match is found — most tickers, especially smaller
 * caps, are expected to come back null.
 */
export async function fetchWikipediaSummary(companyName: string): Promise<WikipediaMatch | null> {
  const stripped = stripLegalSuffix(companyName);
  const candidates = stripped === companyName ? [companyName] : [companyName, stripped];

  for (const candidate of candidates) {
    const summary = (await fetchJson(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(candidate.replace(/ /g, "_"))}`
    )) as WikipediaSummaryResponse | null;
    if (!summary || summary.type !== "standard" || !summary.extract) continue;

    const wikibaseItem = summary.wikibase_item;
    if (!wikibaseItem) continue;
    if (!(await isConfirmedBusiness(wikibaseItem))) continue;

    return {
      title: summary.title,
      summary: summary.extract,
      url: summary.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(summary.title.replace(/ /g, "_"))}`,
    };
  }
  return null;
}
