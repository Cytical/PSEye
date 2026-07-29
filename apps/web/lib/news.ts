import { createDb, getRecentNews as getRecentNewsQuery, getNewsOutletLogos } from "@pseye/db";
import {
  RELIABLE_NEWS_SOURCES,
  UNVERIFIED_NEWS_SOURCES,
  type NewsItem,
  type NewsSentiment,
  type NewsSource,
} from "@pseye/source-news";

// news_items.sentiment is a plain `varchar(8) | null` column (see schema.ts)
// — Drizzle's inferred row type is `string | null`, not the narrower
// NewsSentiment union, so this narrows it back rather than casting. Returns
// null both for legitimately-null rows (not yet (re-)scored, see the
// schema's own comment) and for any unexpected value, which shouldn't ever
// happen but a stray value shouldn't crash rendering either way.
function isNewsSentiment(value: string | null): value is NewsSentiment {
  return value === "positive" || value === "negative" || value === "neutral";
}

// Front page: 1 hero + 4 secondary stories. Kept small on purpose — a wall of
// headlines is what this redesign is replacing.
const FEATURED_COUNT = 5;
// "More headlines" below the fold. Also capped, rather than dumping every
// item every outlet published this hour.
const MORE_COUNT = 10;
// A no-trade-today window is generous; a week is plenty for "recent" news
// and keeps stale wire-service reposts out of the front page.
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
// Enough rows for FEATURED_COUNT + MORE_COUNT to survive rankByRelevance's
// age filter and tag-tier sort with room to spare.
const DB_FETCH_LIMIT = 80;

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

export interface NewsMoodSummary {
  positive: number;
  negative: number;
  neutral: number;
  total: number;
}

/**
 * "Market Mood" strip aggregate — same breadth-strip spirit as the daily
 * recap's advancers/decliners/unchanged count (see dailyRecap.ts and
 * tweetCopy.ts's "X🟢 advancers · Y🔴 decliners · Z flat" line), just for
 * headline sentiment instead of price moves. A null/unscored sentiment
 * (pre-migration-0013 rows not yet re-fetched, or a live-fetch item — see
 * NewsItem.sentiment's comment) counts as neutral rather than being dropped,
 * so `positive + negative + neutral` always equals `total`.
 */
export function computeMoodSummary(items: NewsItem[]): NewsMoodSummary {
  let positive = 0;
  let negative = 0;
  let neutral = 0;

  for (const item of items) {
    if (item.sentiment === "positive") positive++;
    else if (item.sentiment === "negative") negative++;
    else neutral++;
  }

  return { positive, negative, neutral, total: items.length };
}

async function fetchFrom(sources: NewsSource[]): Promise<NewsItem[]> {
  const results = await Promise.allSettled(sources.map((source) => source.fetchLatest()));
  return results.flatMap((result) => (result.status === "fulfilled" ? result.value : []));
}

export interface NewsPageData {
  top: Promise<NewsItem[]>;
  rest: Promise<NewsItem[]>;
  mood: Promise<NewsMoodSummary>;
}

/**
 * Splits news fetching by outlet reliability tier (see outlets.ts) instead of
 * awaiting every outlet before rendering anything. `top` resolves as soon as
 * the confirmed-reachable outlets respond, so the page's first Suspense
 * boundary can paint quickly; `rest`/`mood` additionally wait on the
 * unverified outlets and stream in afterward. `reliable`/`unverified` are
 * each fetched exactly once and shared by all three derived values — same
 * "one read, several slices" shape as the DB path in getNewsPageData below.
 *
 * Only ever called as a fallback (DATABASE_URL unset, the DB read failed, or
 * the news_items table is still empty) — see getNewsPageData below.
 */
function fetchLiveProgressive(): NewsPageData {
  const reliable = fetchFrom(RELIABLE_NEWS_SOURCES).then(rankByRelevance);
  const unverified = fetchFrom(UNVERIFIED_NEWS_SOURCES);

  const top = reliable.then((items) => items.slice(0, FEATURED_COUNT));

  const rest = Promise.all([reliable, unverified]).then(([reliableItems, unverifiedItems]) =>
    rankByRelevance([...reliableItems.slice(FEATURED_COUNT), ...unverifiedItems]).slice(0, MORE_COUNT)
  );

  // Mood doesn't need `rest`'s "exclude what's already in top" precision (a
  // duplicate count in an aggregate is harmless, unlike a duplicate card on
  // the page) — reuses the same `reliable`/`unverified` promises rather than
  // triggering a third live fetch.
  const mood = Promise.all([reliable, unverified]).then(([reliableItems, unverifiedItems]) =>
    computeMoodSummary(rankByRelevance([...reliableItems, ...unverifiedItems]))
  );

  return { top, rest, mood };
}

/**
 * DB-backed when DATABASE_URL is configured and the hourly ETL job
 * (etl/jobs/fetch-news.ts) has populated it, otherwise null (triggering the
 * live-fetch fallback) — same contract as getDailyQuotes. Returning null
 * rather than [] on empty/error distinguishes "nothing to show" from
 * "couldn't read the table", both of which should fall back the same way.
 */
async function fetchRankedFromDb(databaseUrl: string): Promise<NewsItem[] | null> {
  try {
    const db = createDb(databaseUrl);
    const [rows, outletLogos] = await Promise.all([
      getRecentNewsQuery(db, DB_FETCH_LIMIT),
      getNewsOutletLogos(db),
    ]);
    if (rows.length === 0) return null;

    return rankByRelevance(
      rows.map((r) => ({
        source: r.source,
        title: r.title,
        snippet: r.snippet,
        imageUrl: r.imageUrl,
        url: r.url,
        publishedAt: r.publishedAt,
        tickers: r.tickers,
        // fetch-news.ts's third-choice image fallback stores the outlet's
        // own cached logo straight into imageUrl (see news_outlet_logos'
        // schema comment) rather than adding a new column — comparing
        // against that same cache here is how NewsThumbnail.tsx knows to
        // render it with object-contain instead of a cropping object-cover.
        imageIsLogo: r.imageUrl != null && outletLogos.get(r.source) === r.imageUrl,
        sentiment: isNewsSentiment(r.sentiment) ? r.sentiment : null,
      }))
    );
  } catch (err) {
    console.error("getNewsPageData: DB read failed, falling back to live RSS fetch", err);
    return null;
  }
}

/**
 * Single entry point for /news: one shared "ranked full list" read (DB when
 * available and populated, live fetch otherwise), with `top`/`rest`/`mood`
 * all `.then()`-derived slices/aggregates over that *one* promise — replaces
 * a previous version of this file where the front-page list and the "Market
 * Mood" aggregate were two independent functions that each read the DB on
 * their own, for what was ultimately the same ranked list. `dbRanked` is
 * still only ever invoked once here no matter how many of `top`/`rest`/
 * `mood` a caller actually awaits — an unawaited `.then()` derivation still
 * runs, it's just not free-standing expensive work, unlike a second DB
 * round-trip would be.
 */
export function getNewsPageData(): NewsPageData {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return fetchLiveProgressive();

  const dbRanked = fetchRankedFromDb(databaseUrl);

  let liveFallback: NewsPageData | null = null;
  function getLiveFallback(): NewsPageData {
    if (!liveFallback) liveFallback = fetchLiveProgressive();
    return liveFallback;
  }

  const top = dbRanked.then((items) => (items ? items.slice(0, FEATURED_COUNT) : getLiveFallback().top));
  const rest = dbRanked.then((items) =>
    items ? items.slice(FEATURED_COUNT, FEATURED_COUNT + MORE_COUNT) : getLiveFallback().rest
  );
  const mood = dbRanked.then((items) => (items ? computeMoodSummary(items) : getLiveFallback().mood));

  return { top, rest, mood };
}

/**
 * Recent headlines mentioning a specific ticker, for /stocks/[ticker]'s "In
 * the news" section — a different page/request than /news, so there's no
 * shared-fetch opportunity with getNewsPageData above (Next.js doesn't
 * dedupe our own createDb()/Drizzle calls across unrelated route renders the
 * way it does fetch()). Same DB-first-else-live contract as getNewsPageData,
 * just a single `fetchRankedFromDb` call, not two.
 */
export async function getNewsForTicker(ticker: string, limit = 5): Promise<NewsItem[]> {
  const databaseUrl = process.env.DATABASE_URL;
  const ranked = databaseUrl
    ? ((await fetchRankedFromDb(databaseUrl)) ?? (await fetchLiveAll()))
    : await fetchLiveAll();

  return ranked.filter((item) => item.tickers.includes(ticker)).slice(0, limit);
}

async function fetchLiveAll(): Promise<NewsItem[]> {
  const [reliable, unverified] = await Promise.all([
    fetchFrom(RELIABLE_NEWS_SOURCES),
    fetchFrom(UNVERIFIED_NEWS_SOURCES),
  ]);
  return rankByRelevance([...reliable, ...unverified]);
}
