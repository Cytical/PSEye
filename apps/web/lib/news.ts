import {
  RELIABLE_NEWS_SOURCES,
  UNVERIFIED_NEWS_SOURCES,
  type NewsItem,
  type NewsSource,
} from "@pseye/source-news";

// Front page: 1 hero + 4 secondary stories. Kept small on purpose — a wall of
// headlines is what this redesign is replacing.
const FEATURED_COUNT = 5;
// "More headlines" below the fold. Also capped, rather than dumping every
// item every outlet published this hour.
const MORE_COUNT = 10;
// A no-trade-today window is generous; a week is plenty for "recent" news
// and keeps stale wire-service reposts out of the front page.
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function sortByDate(items: NewsItem[]): NewsItem[] {
  return [...items].sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
}

/**
 * Ranks by relevance to a PSE tracker, not just recency: stories tagged with
 * a ticker (i.e. actually about a listed company) lead, generic business
 * news follows, each tier newest-first. Also drops anything older than
 * MAX_AGE_MS so a slow-moving outlet's backlog can't dominate the front page.
 */
function rankByRelevance(items: NewsItem[]): NewsItem[] {
  const cutoff = Date.now() - MAX_AGE_MS;
  const fresh = items.filter((item) => item.publishedAt.getTime() >= cutoff);
  const tagged = sortByDate(fresh.filter((item) => item.tickers.length > 0));
  const untagged = sortByDate(fresh.filter((item) => item.tickers.length === 0));
  return [...tagged, ...untagged];
}

async function fetchFrom(sources: NewsSource[]): Promise<NewsItem[]> {
  const results = await Promise.allSettled(sources.map((source) => source.fetchLatest()));
  return results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
}

/**
 * Splits news fetching by outlet reliability tier (see outlets.ts) instead of
 * awaiting every outlet before rendering anything. `top` resolves as soon as
 * the confirmed-reachable outlets respond, so the page's first Suspense
 * boundary can paint quickly; `rest` additionally waits on the unverified
 * outlets and streams in afterward.
 */
export function fetchNewsProgressive(): {
  top: Promise<NewsItem[]>;
  rest: Promise<NewsItem[]>;
} {
  const reliable = fetchFrom(RELIABLE_NEWS_SOURCES).then(rankByRelevance);

  const top = reliable.then((items) => items.slice(0, FEATURED_COUNT));

  const rest = Promise.all([reliable, fetchFrom(UNVERIFIED_NEWS_SOURCES)]).then(
    ([reliableItems, unverifiedItems]) =>
      rankByRelevance([...reliableItems.slice(FEATURED_COUNT), ...unverifiedItems]).slice(
        0,
        MORE_COUNT
      )
  );

  return { top, rest };
}
