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

export interface TrendingTicker {
  ticker: string;
  count: number;
}

const TRENDING_TICKER_COUNT = 8;

/**
 * "Most mentioned today" — counts how often each ticker appears across
 * `items`' tickers arrays, no new storage (derived at render time over the
 * same recent-news window every other function here already reads). Ties
 * break alphabetically for a stable order rather than insertion order,
 * which would otherwise silently depend on Map iteration/article order.
 */
export function computeTrendingTickers(items: NewsItem[]): TrendingTicker[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const ticker of item.tickers) {
      counts.set(ticker, (counts.get(ticker) ?? 0) + 1);
    }
  }

  return Array.from(counts.entries())
    .map(([ticker, count]) => ({ ticker, count }))
    .sort((a, b) => b.count - a.count || a.ticker.localeCompare(b.ticker))
    .slice(0, TRENDING_TICKER_COUNT);
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
 *
 * Only ever called as a fallback (DATABASE_URL unset, the DB read failed, or
 * the news_items table is still empty) — see fetchNewsProgressive below.
 */
function fetchLiveProgressive(): { top: Promise<NewsItem[]>; rest: Promise<NewsItem[]> } {
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
    console.error("fetchNewsProgressive: DB read failed, falling back to live RSS fetch", err);
    return null;
  }
}

/**
 * Reads pre-fetched headlines from our own DB (one query) instead of
 * live-fetching every outlet's RSS feed on every page load/ISR revalidation
 * — the hourly fetch-news ETL job already did that work. Falls back to the
 * original live progressive fetch when DATABASE_URL is unset, the table is
 * still empty, or the DB read errors, so the page never breaks — same
 * fallback contract as every other DB-backed lib function here.
 *
 * `top`/`rest` share a single fallback attempt (memoized in getLiveFallback)
 * rather than each independently triggering its own live-fetch waterfall if
 * the DB path comes back empty.
 */
export function fetchNewsProgressive(): {
  top: Promise<NewsItem[]>;
  rest: Promise<NewsItem[]>;
} {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return fetchLiveProgressive();

  const dbRanked = fetchRankedFromDb(databaseUrl);

  let liveFallback: { top: Promise<NewsItem[]>; rest: Promise<NewsItem[]> } | null = null;
  function getLiveFallback() {
    if (!liveFallback) liveFallback = fetchLiveProgressive();
    return liveFallback;
  }

  const top = dbRanked.then((items) => (items ? items.slice(0, FEATURED_COUNT) : getLiveFallback().top));
  const rest = dbRanked.then((items) =>
    items ? items.slice(FEATURED_COUNT, FEATURED_COUNT + MORE_COUNT) : getLiveFallback().rest
  );

  return { top, rest };
}

/**
 * Recent headlines mentioning a specific ticker, for /stocks/[ticker]'s "In
 * the news" section — same DB-first-else-live contract as
 * fetchNewsProgressive, just without the progressive Suspense split, since a
 * single small section doesn't need it.
 */
export async function getNewsForTicker(ticker: string, limit = 5): Promise<NewsItem[]> {
  const databaseUrl = process.env.DATABASE_URL;
  const ranked = databaseUrl
    ? ((await fetchRankedFromDb(databaseUrl)) ?? (await fetchLiveAll()))
    : await fetchLiveAll();

  return ranked.filter((item) => item.tickers.includes(ticker)).slice(0, limit);
}

/**
 * "Market Mood" + "Trending Tickers" data for /news — both derived from the
 * same recent/relevant news window fetchNewsProgressive ranks from (DB when
 * available and populated, live fetch otherwise, same fallback contract as
 * getNewsForTicker above), computed fresh per request rather than persisted:
 * cheap over <=80-200 rows, and unlike sentiment itself (which needs to be
 * *stable* historically, hence persisted on the row — see NewsItem.sentiment)
 * these are just today's snapshot, recomputed every time by design.
 */
export async function getNewsInsights(): Promise<{ mood: NewsMoodSummary; trending: TrendingTicker[] }> {
  const databaseUrl = process.env.DATABASE_URL;
  const ranked = databaseUrl
    ? ((await fetchRankedFromDb(databaseUrl)) ?? (await fetchLiveAll()))
    : await fetchLiveAll();

  return { mood: computeMoodSummary(ranked), trending: computeTrendingTickers(ranked) };
}

/**
 * Flat, true-reverse-chronological headline list for the RSS feed
 * (feed.xml/route.ts) — unlike fetchNewsProgressive's relevance-tiered
 * top/rest split (built for the front page's layout), a feed reader expects
 * plain newest-first order.
 */
export async function getRecentNewsFeed(limit = 30): Promise<NewsItem[]> {
  const { top, rest } = fetchNewsProgressive();
  const [topItems, restItems] = await Promise.all([top, rest]);
  return sortByDate([...topItems, ...restItems]).slice(0, limit);
}

async function fetchLiveAll(): Promise<NewsItem[]> {
  const [reliable, unverified] = await Promise.all([
    fetchFrom(RELIABLE_NEWS_SOURCES),
    fetchFrom(UNVERIFIED_NEWS_SOURCES),
  ]);
  return rankByRelevance([...reliable, ...unverified]);
}
