import { unstable_cache } from "next/cache";
import { createDb, getRecentNews as getRecentNewsQuery, getNewsOutletLogos } from "@pseye/db";
import {
  RELIABLE_NEWS_SOURCES,
  UNVERIFIED_NEWS_SOURCES,
  cleanAuthorName,
  clusterStories,
  isBusinessRelevant,
  isNewsTopic,
  topicToSlug,
  FALLBACK_TOPIC,
  NEWS_DESKS,
  NEWS_TOPICS,
  type NewsCluster,
  type NewsDesk,
  type NewsItem,
  type NewsSentiment,
  type NewsSource,
} from "@pseye/source-news";
import { getDailyQuotes } from "./quotes";

// news_items.sentiment is a plain `varchar(8) | null` column (see schema.ts)
// — Drizzle's inferred row type is `string | null`, not the narrower
// NewsSentiment union, so this narrows it back rather than casting. Returns
// null both for legitimately-null rows (not yet (re-)scored, see the
// schema's own comment) and for any unexpected value, which shouldn't ever
// happen but a stray value shouldn't crash rendering either way.
function isNewsSentiment(value: string | null): value is NewsSentiment {
  return value === "positive" || value === "negative" || value === "neutral";
}

// Front page: one hero plus this many sub-headlines in the right rail. Cut
// from four to three (2026-08-07) to buy back the vertical space the rail was
// spending past the hero image's own height.
const FEATURED_RAIL_COUNT = 3;
// How many stories of a desk the /news front page's desk directory shows
// before handing off to that desk's own page. The desks themselves are no
// longer capped (2026-08-07, when /news/[topic] was added): the front page
// used to be the only place a story could appear, so it had to carry
// everything, which is what made it 5,000px of headlines. Now it previews and
// links, and the full desk lives at /news/<slug>.
//
// Three, not five. Five was tried first and made the page *longer* than the
// version it replaced: uncapping the desks surfaced all eleven of them, and
// eleven blocks of five is more stories than the old flat grid of thirty-six
// ever showed. Three headlines is enough to say what a desk is currently
// about, which is the only job the directory has.
export const DESK_PREVIEW_COUNT = 3;

// The "Latest" strip between the front page and the desk directory. Purely
// chronological, which nothing else on this page is: rankByRelevance sorts
// ticker-tagged stories ahead of untagged ones, so without this a reader has
// no way to see what simply came in most recently.
const LATEST_COUNT = 4;
// A desk with fewer than this many stories is folded into "More headlines"
// rather than given its own heading. A section of one is a headline wearing a
// hat; two is thin but still reads as a desk, and measured against the live
// feed the difference is stark: at 3 a typical day named 3 desks and dumped 9
// stories in the catch-all, at 2 it named 6 and dumped 3. The catch-all is the
// thing worth minimising, since it's the one heading that tells a reader
// nothing.
const MIN_STORIES_PER_TOPIC = 2;
// A no-trade-today window is generous; a week is plenty for "recent" news
// and keeps stale wire-service reposts out of the front page.
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;
// The whole working corpus for /news and every /news/[topic] page: enough
// rows to survive rankByRelevance's 7-day cutoff and still fill each desk.
// Manila Times Business alone can contribute up to 50 items in a single fetch.
const DB_FETCH_LIMIT = 200;

function sortByDate(items: NewsItem[]): NewsItem[] {
  return [...items].sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
}

/**
 * The corpus every /news view is built from: business stories filed inside
 * the MAX_AGE_MS window, newest first.
 *
 * Used to be a two-tier sort as well (every ticker-tagged story, then every
 * untagged one). That tier is gone: it is now one term in scoreImportance,
 * where it can be outweighed instead of being absolute. A plain date sort
 * here also gives rankClusters a meaningful tie-break, and gives
 * getNewsForTicker (which filters to one company, so the tier never applied)
 * the chronological order it always wanted.
 *
 * isBusinessRelevant is also applied at fetch time (see rssSource.ts), so for
 * anything ingested since then this is a no-op. It runs here too because rows
 * written before that filter existed are already in the table and will never
 * be re-fetched: a story only comes round again while it is still inside its
 * outlet's feed window, and an editorial cartoon from last week never will be.
 * Cheap enough to be worth not caring which it is.
 */
function rankByRelevance(items: NewsItem[]): NewsItem[] {
  const cutoff = Date.now() - MAX_AGE_MS;
  return sortByDate(
    items.filter((item) => item.publishedAt.getTime() >= cutoff && isBusinessRelevant(item.url))
  );
}

/**
 * How fast a story's score halves with age, in hours.
 *
 * The corpus is 7 days deep (MAX_AGE_MS) and the whole point of scoring is
 * that an old-but-important story can still outrank a fresh trivial one, so
 * this has to decay gently enough for importance to matter across that whole
 * window. 48h puts a week-old story at 0.088 of its own fresh value: a
 * maximum-importance story from last Friday (~6.9 * 0.088 = 0.61) still beats
 * a middling two-day-old one (~2.4 * 0.5 = 1.2)? No — it loses, and that is
 * the intended shape. What it does beat is the large volume of low-importance
 * filler from three and four days ago, which is what a pure date sort buries
 * it under.
 *
 * Tried and rejected: 24h (a week-old story lands at 0.008, i.e. the 7-day
 * window is decorative) and 96h (yesterday and four days ago score within 30%
 * of each other, so the front page stops turning over).
 */
const SCORE_HALF_LIFE_HOURS = 48;

/**
 * Desks whose stories are, for a PSE tracker specifically, more likely to
 * matter than the same-sized story elsewhere. Not a judgement about the news:
 * this site is a stock market tracker, and a reader here came for the market.
 */
const CORE_DESKS = new Set<string>(["Markets", "Earnings", "Banking & Finance", "Economy"]);

/** A story worth this many words is reporting, not a two-paragraph brief. */
const SUBSTANTIAL_WORD_COUNT = 400;

/**
 * How much a story matters, before any consideration of when it was filed.
 *
 * Every term is something already stored on the row or derivable from the
 * cluster, so this costs no fetch and no extra column: the news ETL job is
 * unchanged and this stays a read-time computation. The weights are ordered
 * by how much each signal has actually predicted "story a PSE reader wants":
 *
 * - Being about a listed company at all is the single strongest signal, since
 *   the untagged tier is largely macro wire copy and government press releases.
 * - Multi-outlet pickup is the classic wire signal. Five desks filing on one
 *   event within the hour is the newsroom's own collective judgement that it
 *   is the day's story, and it is free here because clustering already
 *   computed it.
 * - A core desk, a story naming several listed companies, and a real body
 *   (rather than a stub the outlet truncated) are smaller nudges.
 */
export function scoreImportance(cluster: NewsCluster): number {
  const { lead, alsoCoveredBy } = cluster;
  let score = 1;
  if (lead.tickers.length > 0) score += 1.4;
  score += 0.4 * Math.min(lead.tickers.length - 1, 2);
  score += 0.9 * Math.min(alsoCoveredBy.length, 3);
  if (lead.topic && CORE_DESKS.has(lead.topic)) score += 0.7;
  if ((lead.wordCount ?? 0) >= SUBSTANTIAL_WORD_COUNT) score += 0.3;
  return score;
}

/**
 * Importance, decayed by age. The ordering key for everything on /news that
 * is not explicitly chronological.
 *
 * Replaces a two-tier sort (every ticker-tagged story, newest first, then
 * every untagged one) that could not express "old but big": a Monday story
 * five outlets covered sat below every Friday brief simply because both were
 * tagged and Friday is newer. `now` is a parameter rather than a Date.now()
 * call so the ordering is testable.
 */
export function scoreStory(cluster: NewsCluster, now: number): number {
  const ageHours = Math.max(0, (now - cluster.lead.publishedAt.getTime()) / 3_600_000);
  return scoreImportance(cluster) * Math.pow(0.5, ageHours / SCORE_HALF_LIFE_HOURS);
}

/** Highest-scoring first. Ties keep the input order, which is date-sorted by
 * the time it gets here, so equal-scoring stories still read newest-first. */
export function rankClusters(clusters: NewsCluster[], now = Date.now()): NewsCluster[] {
  return [...clusters]
    .map((cluster, i) => ({ cluster, i, score: scoreStory(cluster, now) }))
    .sort((a, b) => b.score - a.score || a.i - b.i)
    .map((entry) => entry.cluster);
}

/**
 * The front page's hero plus its right-hand rail of sub-headlines.
 *
 * The rail is reserved for market stories: the "Markets" desk first, then any
 * other story tagged with a listed company, and only then whatever scored
 * highest overall. A general business front page can lead with anything, but
 * the four slots at the top of *this* site should be about the exchange it
 * tracks, and before this the rail was simply the next four by score, which
 * on a quiet market day filled with macro and policy copy.
 *
 * The hero is deliberately exempt: it is the day's biggest story whatever
 * desk it came from, and forcing it to be a Markets story would mean burying
 * a major economic story under a minor one about a listed company.
 */
export function pickFeatured(ranked: NewsCluster[]): NewsCluster[] {
  const [hero, ...rest] = ranked;
  if (!hero) return [];

  const isMarkets = (c: NewsCluster) => c.lead.topic === "Markets";
  const isPseStory = (c: NewsCluster) => c.lead.tickers.length > 0;

  const rail: NewsCluster[] = [];
  const taken = new Set<NewsCluster>();
  // Three passes over the same already-scored list, so within each tier the
  // rail is still ordered by score rather than by which pass found it.
  for (const test of [isMarkets, isPseStory, () => true]) {
    for (const cluster of rest) {
      if (rail.length >= FEATURED_RAIL_COUNT) break;
      if (taken.has(cluster) || !test(cluster)) continue;
      taken.add(cluster);
      rail.push(cluster);
    }
  }

  return [hero, ...rail];
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

/** A named desk on the section front, e.g. "Energy & Power". */
export interface NewsSection {
  topic: NewsDesk;
  stories: NewsCluster[];
}

/**
 * Today's move for a ticker a story is tagged with, so a headline about a
 * company can be read next to what that company's stock actually did. This
 * is the one thing /news can show that a general news site structurally
 * cannot, and it costs no extra query: getDailyQuotes is already cached and
 * already read by nearly every other route.
 *
 * A ticker absent from the map has no quote today; a present-but-null value
 * means the stock is listed but didn't trade (see Quote.price's contract in
 * lib/quotes.ts). Both render as no chip rather than as a fabricated 0.00%.
 */
export type MarketReactions = Map<string, number | null>;

/** One entry in the desk navigation: a desk that actually has stories right
 * now, with its slug and how many. Desks with nothing in the current window
 * are omitted, so the nav never links to an empty page. */
export interface DeskCount {
  topic: NewsDesk;
  slug: string;
  count: number;
}

export interface NewsPageData {
  top: Promise<NewsCluster[]>;
  latest: Promise<NewsCluster[]>;
  sections: Promise<NewsSection[]>;
  mood: Promise<NewsMoodSummary>;
  reactions: Promise<MarketReactions>;
  mostMentioned: Promise<CompanyMention[]>;
  desks: Promise<DeskCount[]>;
}

/**
 * The most recently filed stories that aren't already on the front page,
 * newest first.
 *
 * `exclude` is the front-page five: a story is allowed to appear in both the
 * "Latest" strip and a desk's directory entry (they answer different
 * questions, and a reader scanning by time and a reader scanning by subject
 * are not the same reader), but running the hero again three inches below
 * itself just reads as a bug.
 */
export function pickLatest(clusters: NewsCluster[], exclude: NewsCluster[]): NewsCluster[] {
  const shown = new Set(exclude.map((c) => c.lead.url));
  return clusters
    .filter((c) => !shown.has(c.lead.url))
    .sort((a, b) => b.lead.publishedAt.getTime() - a.lead.publishedAt.getTime())
    .slice(0, LATEST_COUNT);
}

/** The desk a story belongs on, treating an unrecognised or missing value as
 * the catch-all rather than as its own phantom desk. */
export function deskOf(cluster: NewsCluster): NewsDesk {
  return isNewsTopic(cluster.lead.topic) ? cluster.lead.topic : FALLBACK_TOPIC;
}

function bucketByDesk(clusters: NewsCluster[]): Map<NewsDesk, NewsCluster[]> {
  const byTopic = new Map<NewsDesk, NewsCluster[]>();
  for (const cluster of clusters) {
    const topic = deskOf(cluster);
    const bucket = byTopic.get(topic);
    if (bucket) bucket.push(cluster);
    else byTopic.set(topic, [cluster]);
  }
  return byTopic;
}

/**
 * Splits an already-ranked, already-clustered list into desks, in the fixed
 * order NEWS_TOPICS declares rather than by how many stories each happened
 * to get today: a section front whose sections reshuffle every few hours is
 * one a reader can never learn the shape of. Anything under
 * MIN_STORIES_PER_TOPIC, plus everything that classified as FALLBACK_TOPIC,
 * collects at the end under the catch-all.
 *
 * The catch-all is labelled FALLBACK_TOPIC ("General Business") rather than
 * the "More headlines" it used to be. It is a browsable desk with its own
 * page now, and a page cannot be titled "more" of something the reader has
 * not been shown yet.
 */
export function groupIntoSections(clusters: NewsCluster[]): NewsSection[] {
  const byTopic = bucketByDesk(clusters);

  const sections: NewsSection[] = [];
  const leftovers: NewsCluster[] = [];

  for (const topic of NEWS_TOPICS) {
    const stories = byTopic.get(topic) ?? [];
    if (stories.length >= MIN_STORIES_PER_TOPIC) sections.push({ topic, stories });
    else leftovers.push(...stories);
  }
  leftovers.push(...(byTopic.get(FALLBACK_TOPIC) ?? []));

  if (leftovers.length > 0) {
    // Ranking was lost when the desks were split out, so the catch-all is
    // re-sorted by date to stay coherent on its own.
    leftovers.sort((a, b) => b.lead.publishedAt.getTime() - a.lead.publishedAt.getTime());
    sections.push({ topic: FALLBACK_TOPIC, stories: leftovers });
  }

  return sections;
}

/**
 * Every desk with at least one story, for the nav that now runs across the
 * top of /news and each /news/[topic] page.
 *
 * Counted over the *whole* corpus rather than over what a given page renders,
 * including the front-page five: the nav is a map of what exists, and a count
 * that shrank because a story was promoted to the hero would make the map
 * lie. Fixed NEWS_DESKS order for the same reason groupIntoSections uses one.
 */
export function countDesks(clusters: NewsCluster[]): DeskCount[] {
  const byTopic = bucketByDesk(clusters);
  return NEWS_DESKS.map((topic) => ({
    topic,
    slug: topicToSlug(topic),
    count: byTopic.get(topic)?.length ?? 0,
  })).filter((desk) => desk.count > 0);
}

/** How many stories in the current window mention a company. */
export interface CompanyMention {
  ticker: string;
  stories: number;
}

/** How many companies the "In the news" rail lists. Six fits one row at every
 * breakpoint the page uses; more turns a summary back into a list. */
const MOST_MENTIONED_COUNT = 6;

/** A company named in only one story isn't "in the news", it's in a story. */
const MIN_MENTIONS = 2;

/**
 * The companies this week's coverage is actually about, most-covered first.
 *
 * The equivalent of a newspaper's "most read" rail, except it can be computed
 * honestly from what was published rather than needing traffic data this site
 * doesn't collect. Counted over stories, not clusters, on purpose: five
 * outlets all filing on one company is exactly the signal that company is the
 * week's story.
 *
 * Ties break alphabetically so the rail is stable between renders of the same
 * data instead of reordering on Map iteration order.
 */
export function computeMostMentioned(items: NewsItem[]): CompanyMention[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    for (const ticker of item.tickers) counts.set(ticker, (counts.get(ticker) ?? 0) + 1);
  }
  return [...counts]
    .filter(([, stories]) => stories >= MIN_MENTIONS)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, MOST_MENTIONED_COUNT)
    .map(([ticker, stories]) => ({ ticker, stories }));
}

/** Today's percent change for every ticker any of these stories mentions.
 * Falls back to an empty map on any quote-read failure: a missing reaction
 * chip is a cosmetic loss, and it must never be able to take /news down. */
async function loadReactions(items: NewsItem[]): Promise<MarketReactions> {
  const wanted = new Set(items.flatMap((item) => item.tickers));
  if (wanted.size === 0) return new Map();
  try {
    const quotes = await getDailyQuotes();
    return new Map(
      quotes.filter((quote) => wanted.has(quote.ticker)).map((quote) => [quote.ticker, quote.pctChange])
    );
  } catch (err) {
    console.error("loadReactions: quote read failed, rendering /news without reaction chips", err);
    return new Map();
  }
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
  const everything = Promise.all([reliable, unverified]).then(([a, b]) => rankByRelevance([...a, ...b]));

  // Clustered against the reliable tier alone, since that's all this
  // boundary has: an "also covered by" credit that grows once the slower
  // outlets land would mean re-rendering the hero, so the front page just
  // shows what it can see when it paints.
  const top = reliable.then((items) => pickFeatured(rankClusters(clusterStories(items))));

  const everythingClustered = everything.then((items) => rankClusters(clusterStories(items)));

  const sections = everythingClustered.then(groupIntoSections);
  const desks = everythingClustered.then(countDesks);
  const latest = Promise.all([everythingClustered, top]).then(([all, featured]) =>
    pickLatest(all, featured)
  );

  // Mood doesn't need the sections' "exclude what's already in top"
  // precision (a duplicate count in an aggregate is harmless, unlike a
  // duplicate card on the page) — reuses the same promise rather than
  // triggering a third live fetch. Counted per story, not per cluster, so
  // five outlets covering one negative event still register as five
  // negative headlines, which is what "across N recent headlines" claims.
  const mood = everything.then(computeMoodSummary);
  const reactions = everything.then(loadReactions);
  const mostMentioned = everything.then(computeMostMentioned);

  return { top, latest, sections, mood, reactions, mostMentioned, desks };
}

/** Same shape as NewsItem, but publishedAt as an ISO string — unstable_cache
 * round-trips its return value through JSON, so a raw Date would come back
 * as a string on a cache hit anyway while still claiming the `Date` type;
 * storing it as a string explicitly (like Disclosure.filedAt in
 * disclosures.ts) avoids a silent `.getTime()`-is-not-a-function break. */
type CachedNewsRow = Omit<NewsItem, "publishedAt"> & { publishedAt: string };

/**
 * DB-backed when DATABASE_URL is configured and the hourly ETL job
 * (etl/jobs/fetch-news.ts) has populated it, otherwise null (triggering the
 * live-fetch fallback) — same contract as getDailyQuotes. Returning null
 * rather than [] on empty/error distinguishes "nothing to show" from
 * "couldn't read the table", both of which should fall back the same way.
 *
 * Wrapped in unstable_cache: getNewsForTicker below calls fetchRankedFromDb
 * once per ticker (282 generateStaticParams pages) for what's always the
 * same DB_FETCH_LIMIT-row read — same whole-table-fanned-out-across-282-
 * pages shape as quotes.ts/companyProfiles.ts, just reached through a
 * different caller. 3600s window matches the hourly news ETL cadence.
 * Ranking is deliberately done outside the cache (in fetchRankedFromDb
 * below), not in here — rankByRelevance's MAX_AGE_MS cutoff reads
 * Date.now(), which should stay live on every call rather than freeze at
 * whatever moment the cache entry was written.
 */
const fetchCachedNewsRows = unstable_cache(
  async (databaseUrl: string): Promise<CachedNewsRow[] | null> => {
    try {
      const db = createDb(databaseUrl);
      const [rows, outletLogos] = await Promise.all([
        getRecentNewsQuery(db, DB_FETCH_LIMIT),
        getNewsOutletLogos(db),
      ]);
      if (rows.length === 0) return null;

      return rows.map((r) => ({
        source: r.source,
        title: r.title,
        snippet: r.snippet,
        imageUrl: r.imageUrl,
        url: r.url,
        publishedAt: r.publishedAt.toISOString(),
        tickers: r.tickers,
        // Re-validated on read, not just trusted from the column. A row
        // written before extractAuthor learned to reject CMS junk keeps that
        // junk until its URL happens to reappear in an outlet's feed window,
        // which for an older story never happens — so without this a byline
        // reading "By ___" would sit on the page until the story aged out.
        // Also means any future feed weirdness degrades to no byline rather
        // than to a visible one.
        author: cleanAuthorName(r.author ?? "", r.source),
        // Same narrowing job isNewsSentiment does below: the column is a
        // plain varchar, so an unrecognised value becomes null (rendered as
        // no desk) rather than being trusted as a section heading.
        topic: isNewsTopic(r.topic) ? r.topic : null,
        wordCount: r.wordCount,
        // fetch-news.ts's third-choice image fallback stores the outlet's
        // own cached logo straight into imageUrl (see news_outlet_logos'
        // schema comment) rather than adding a new column — comparing
        // against that same cache here is how NewsThumbnail.tsx knows to
        // render it with object-contain instead of a cropping object-cover.
        imageIsLogo: r.imageUrl != null && outletLogos.get(r.source) === r.imageUrl,
        sentiment: isNewsSentiment(r.sentiment) ? r.sentiment : null,
      }));
    } catch (err) {
      console.error("fetchCachedNewsRows: DB read failed, falling back to live RSS fetch", err);
      return null;
    }
  },
  ["news-rows"],
  { revalidate: 3600, tags: ["news"] }
);

async function fetchRankedFromDb(databaseUrl: string): Promise<NewsItem[] | null> {
  const rows = await fetchCachedNewsRows(databaseUrl);
  if (!rows) return null;
  return rankByRelevance(rows.map((r) => ({ ...r, publishedAt: new Date(r.publishedAt) })));
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

  // Clustered once over the whole ranked list, then sliced — not clustered
  // per slice. Splitting first would put a story on the front page and its
  // duplicate in a desk below, which is the exact repetition the clustering
  // exists to remove. Re-ranked by score afterwards, because cluster size is
  // one of the score's inputs and does not exist until clustering has run.
  const dbClustered = dbRanked.then((items) => (items ? rankClusters(clusterStories(items)) : null));
  const dbFeatured = dbClustered.then((clusters) => (clusters ? pickFeatured(clusters) : null));

  const top = dbFeatured.then((featured) => featured ?? getLiveFallback().top);
  // No slice cap on the desks any more: the front page's directory previews
  // each desk to DESK_PREVIEW_COUNT and links to /news/<slug> for the rest, so
  // truncating the corpus here would silently amputate those pages instead of
  // shortening this one. Nor are the featured stories removed: the count on a
  // desk has to match the one in the nav and on the desk's own page, and the
  // page skips them at render time instead (see SectionFronts).
  const sections = dbClustered.then((clusters) =>
    clusters ? groupIntoSections(clusters) : getLiveFallback().sections
  );
  const mood = dbRanked.then((items) => (items ? computeMoodSummary(items) : getLiveFallback().mood));
  const reactions = dbRanked.then((items) => (items ? loadReactions(items) : getLiveFallback().reactions));
  const mostMentioned = dbRanked.then((items) =>
    items ? computeMostMentioned(items) : getLiveFallback().mostMentioned
  );
  const desks = dbClustered.then((clusters) =>
    clusters ? countDesks(clusters) : getLiveFallback().desks
  );
  const latest = Promise.all([dbClustered, dbFeatured]).then(([clusters, featured]) =>
    clusters && featured ? pickLatest(clusters, featured) : getLiveFallback().latest
  );

  return { top, latest, sections, mood, reactions, mostMentioned, desks };
}

export interface TopicPageData {
  stories: Promise<NewsCluster[]>;
  reactions: Promise<MarketReactions>;
  desks: Promise<DeskCount[]>;
}

/**
 * Everything one desk has, for /news/[topic].
 *
 * Deliberately not built on getNewsPageData: that function's whole shape
 * exists to let the front page paint its hero before the slower outlets
 * answer, and a desk page has no such tier to paint early. It reads the same
 * cached corpus (fetchCachedNewsRows is shared, so this costs no extra query
 * on a warm cache) and just filters it.
 *
 * Front-page stories are *not* excluded. A desk page claims to be that desk's
 * complete run, and holding back the day's biggest story because the front
 * page already used it would make it incomplete in exactly the case a reader
 * would notice.
 */
export function getTopicPageData(topic: NewsDesk): TopicPageData {
  const databaseUrl = process.env.DATABASE_URL;
  const ranked: Promise<NewsItem[]> = databaseUrl
    ? fetchRankedFromDb(databaseUrl).then((items) => items ?? fetchLiveAll())
    : fetchLiveAll();

  const clustered = ranked.then((items) => rankClusters(clusterStories(items)));

  return {
    stories: clustered.then((clusters) => clusters.filter((c) => deskOf(c) === topic)),
    reactions: ranked.then(loadReactions),
    desks: clustered.then(countDesks),
  };
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
