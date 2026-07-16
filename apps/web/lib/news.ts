import {
  RELIABLE_NEWS_SOURCES,
  UNVERIFIED_NEWS_SOURCES,
  type NewsItem,
  type NewsSource,
} from "@pseye/source-news";

const TOP_COUNT = 8;

function sortByDate(items: NewsItem[]): NewsItem[] {
  return [...items].sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
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
  const reliable = fetchFrom(RELIABLE_NEWS_SOURCES).then(sortByDate);

  const top = reliable.then((items) => items.slice(0, TOP_COUNT));

  const rest = Promise.all([reliable, fetchFrom(UNVERIFIED_NEWS_SOURCES)]).then(
    ([reliableItems, unverifiedItems]) =>
      sortByDate([...reliableItems.slice(TOP_COUNT), ...unverifiedItems])
  );

  return { top, rest };
}
