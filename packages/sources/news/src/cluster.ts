import type { NewsItem } from "./types";

/**
 * Groups stories that are covering the same event, so the page can show one
 * card that credits every outlet instead of five near-identical cards in a
 * row.
 *
 * This is the actual reason /news felt like too much: eight PH business
 * desks all file on the same BSP rate decision within an hour of each other,
 * and a feed sorted purely by time renders that as five separate headlines
 * saying almost the same sentence. Wire copy makes it worse, since Reuters
 * and AP stories are republished verbatim under several mastheads.
 *
 * Token-overlap based, not embedding based: it has to run inside a server
 * render with no model call and no network, and headline wording for one
 * event is repetitive enough that set overlap separates it cleanly.
 *
 * The known limit is a full paraphrase. "BSP keeps policy rate steady at
 * 5.25%" and "Central bank keeps benchmark rate unchanged" are one story
 * sharing two content words, and nothing here will merge them. That is the
 * deliberate side to err on: a threshold loose enough to catch it also
 * merges two different quarters of one company's earnings, and hiding a
 * story is worse than showing one twice. See cluster.test.ts.
 */

/**
 * Dropped before comparing, so "BSP holds rates steady" and "BSP keeps
 * policy rate on hold" are measured on their content words. Deliberately
 * short: an aggressive stoplist starts deleting the words that distinguish
 * two genuinely different stories about the same company.
 */
const STOPWORDS = new Set([
  "a", "an", "and", "as", "at", "be", "by", "for", "from", "in", "into", "is",
  "it", "its", "of", "on", "or", "over", "the", "to", "up", "vs", "with",
  "amid", "after", "says", "said", "new", "more", "than", "that", "this",
  "philippines", "philippine", "ph", "manila",
]);

/** Below this a token is punctuation debris or an initial, not a content word. */
const MIN_TOKEN_LENGTH = 3;

/**
 * Jaccard overlap above which two headlines are treated as the same story.
 *
 * 0.5 was picked against the live feed rather than by feel: at 0.4 it began
 * merging distinct earnings stories about the same company (two different
 * quarters read as one), and at 0.6 it stopped catching genuine wire
 * duplicates whose subeditors had rewritten half the headline. Same-event
 * rewrites land comfortably above 0.5; different events about one company
 * land below it, because the company name is only one or two of the tokens.
 */
const SIMILARITY_THRESHOLD = 0.5;

/**
 * The threshold used instead when both stories are tagged with the same
 * company. Sharing a ticker is strong evidence on its own, so much less
 * lexical agreement is needed on top of it.
 *
 * This is what catches the earnings-report case, which is the most visible
 * duplicate on the page because the two cards land next to each other:
 * "Chinabank net profit up 11% to P14.5B in H1" and "Chinabank's net income
 * climbs 11% to P14.5 billion in first half" score 0.25, because the tokens
 * carrying the shared meaning are either synonyms (profit/income) or too
 * short to survive tokenising ("11", "H1", "5b"). Raising the general
 * threshold's sensitivity to reach them would wreck it everywhere else;
 * conditioning on the ticker does not.
 */
const TICKER_ASSISTED_THRESHOLD = 0.25;

/**
 * Two stories filed further apart than this are separate stories even if
 * their headlines match, which is what stops a recurring headline pattern
 * ("Peso closes lower", filed every single trading day) from collapsing a
 * week of distinct daily reports into one card.
 */
const MAX_CLUSTER_SPAN_MS = 36 * 60 * 60 * 1000;

function tokenize(title: string): Set<string> {
  return new Set(
    title
      .toLowerCase()
      // Keeps intra-word hyphens/apostrophes out of the token by splitting on
      // them too, so "non-performing" contributes "non" and "performing"
      // rather than a token no other outlet's phrasing will ever match.
      .split(/[^a-z0-9₱]+/)
      .filter((token) => token.length >= MIN_TOKEN_LENGTH && !STOPWORDS.has(token))
  );
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let shared = 0;
  for (const token of a) if (b.has(token)) shared++;
  return shared / (a.size + b.size - shared);
}

export interface NewsCluster {
  /** The story as it will be shown: the earliest-filed member, i.e. whoever
   * broke it, rather than whoever republished it most recently. */
  lead: NewsItem;
  /** Everyone else covering the same event, newest first. Empty for the
   * common case of a story only one outlet ran. */
  alsoCoveredBy: NewsItem[];
}

/**
 * Clusters an already-ranked list, preserving that ranking: a cluster takes
 * the position of its highest-ranked member, so whatever ordering the caller
 * applied upstream (see rankByRelevance in apps/web/lib/news.ts) still holds
 * over the collapsed list.
 *
 * Greedy and O(n * clusters) rather than a proper agglomerative pass. At the
 * ~200 rows this page reads that is a few thousand set comparisons, and the
 * failure mode of greedy (a story attaching to whichever similar cluster it
 * met first) is invisible when the thing being decided is only which outlet
 * gets the byline.
 */
export function clusterStories(items: NewsItem[]): NewsCluster[] {
  const clusters: { members: NewsItem[]; tokens: Set<string>; tickers: Set<string> }[] = [];

  for (const item of items) {
    const tokens = tokenize(item.title);
    const tickers = new Set(item.tickers);
    const match = clusters.find((cluster) => {
      const sharesTicker = [...tickers].some((ticker) => cluster.tickers.has(ticker));
      const threshold = sharesTicker ? TICKER_ASSISTED_THRESHOLD : SIMILARITY_THRESHOLD;
      if (jaccard(tokens, cluster.tokens) < threshold) return false;
      return cluster.members.some(
        (member) =>
          Math.abs(member.publishedAt.getTime() - item.publishedAt.getTime()) <= MAX_CLUSTER_SPAN_MS
      );
    });

    if (match) {
      match.members.push(item);
      for (const ticker of tickers) match.tickers.add(ticker);
    } else {
      clusters.push({ members: [item], tokens, tickers });
    }
  }

  return clusters.map((cluster) => {
    // Ties (same timestamp, common when outlets stamp to the minute) keep the
    // caller's order, since sort is stable and members are pushed in rank
    // order.
    const byAge = [...cluster.members].sort(
      (a, b) => a.publishedAt.getTime() - b.publishedAt.getTime()
    );
    const [lead] = byAge;
    return {
      lead,
      alsoCoveredBy: cluster.members
        .filter((member) => member !== lead)
        .sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime()),
    };
  });
}
