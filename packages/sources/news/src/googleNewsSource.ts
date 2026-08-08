import Parser from "rss-parser";
import type { NewsItem, NewsSource } from "./types";
import { tagTickers } from "./tickerTagger";
import { scoreSentiment } from "./sentiment";
import { classifyTopic } from "./topics";
import { parsePublishedAt, FEED_REQUEST_HEADERS } from "./rssSource";

/**
 * International wire coverage of PSE/PH stocks (Reuters, Bloomberg, Nikkei
 * Asia), via Google News' search-as-RSS endpoint rather than each outlet's
 * own feed — see outlets.ts for why (Reuters killed its public feeds around
 * 2020; Bloomberg and Nikkei Asia have never published one). This is a
 * genuinely different shape of source from createRssSource (rssSource.ts):
 * that one reads an outlet's own chronological feed, this one reads Google's
 * *search results* for a fixed query, re-fetched fresh every run. Kept in its
 * own file rather than folded into rssSource.ts because enough of the
 * pipeline differs (title needs de-suffixing, there is no snippet field to
 * extract, the outlet name comes from a different place, the link needs
 * different handling downstream — see isGoogleNewsRedirectUrl) that sharing
 * one function would need more branching than just having two.
 *
 * Everything below was verified live against the real endpoint on 2026-08-07,
 * then again 2026-08-08 when the query set was broadened from one phrase per
 * outlet to four (see outlets.ts's Google News section for the actual
 * queries and volumes measured) — nothing here is assumed from training
 * data, since this endpoint's shape is known to have changed before without
 * notice.
 */

/** Google's own request/response contract, confirmed live 2026-08-07:
 * `https://news.google.com/rss/search?q=<query>&hl=en-PH&gl=PH&ceid=PH:en`.
 * `hl`/`gl`/`ceid` bias results toward the Philippines edition rather than
 * changing the query itself — without them the same query still returns
 * results, just ranked/dated for a US reader. */
function buildSearchUrl(query: string): string {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-PH&gl=PH&ceid=PH:en`;
}

/**
 * rss-parser's declared `Item` type doesn't include RSS 2.0's `<source>`
 * element at all (see index.d.ts — only `creator`, not `source`, is a
 * first-class field), and unlike `creator`/`dc:creator` it also isn't mapped
 * at runtime unless explicitly requested — live-tested both ways: a bare
 * `new Parser()` with no `customFields` produced an item with no `source`
 * key whatsoever, while adding `customFields: { item: ["source"] }` (below)
 * produced `item.source === "Reuters"`. This interface exists to type that
 * field once it's actually configured to be read.
 */
interface GoogleNewsExtraFields {
  source?: string;
}

const parser = new Parser<Record<string, unknown>, GoogleNewsExtraFields>({
  timeout: 8_000,
  headers: FEED_REQUEST_HEADERS,
  customFields: {
    item: ["source"],
  },
});

/**
 * How far back a Google News search result can be and still be worth
 * ingesting.
 *
 * Unlike every other source in this package, Google News' feed is *search
 * results*, not a chronological outlet feed — the same query returns items
 * spanning years (live-tested: a "site:reuters.com "Philippine Stock
 * Exchange"" search returned pieces from 2022 sitting next to pieces from
 * last month, ranked by relevance, not date). /news's own read-time window
 * (MAX_AGE_MS in apps/web/lib/news.ts) is 7 days and would hide all of that
 * anyway, but without a cutoff here `fetch-news.ts` would upsert 40-70
 * multi-year-old rows into news_items on every single run forever, for no
 * reader-visible benefit. 30 days is a write-side sanity cap, not a display
 * window — comfortably wider than the 7-day display cutoff so nothing that
 * would actually show up gets dropped before it has the chance to.
 */
const GOOGLE_NEWS_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Google News prints every result's title as `"<Headline> - <Publisher>"`
 * (confirmed live 2026-08-07, e.g. `"Philippine stock exchange suspends
 * Monday trading as typhoon hits capital - Reuters"`). Left in, the outlet
 * name would appear twice on a card — once in the headline, once again in
 * the byline row every card already renders from `source`/`author` — so it's
 * stripped here.
 *
 * `sourceName` should be the *raw* value Google itself attributes the item
 * to (`<source>`, e.g. `"Bloomberg.com"`), not this package's own cleaned-up
 * display name (`"Bloomberg"`) — Google's title suffix matches what it put in
 * `<source>`, which is not always the same string a reader-facing byline
 * should use (see createGoogleNewsSource below, which stores the clean name
 * separately). Only strips an exact trailing `" - <sourceName>"`; a headline
 * that happens to end in something else (a real headline can legitimately
 * end in " - Live Updates") is left alone rather than risking eating part of
 * it.
 */
export function stripGoogleNewsTitleSuffix(title: string, sourceName: string): string {
  const suffix = ` - ${sourceName}`;
  return title.endsWith(suffix) ? title.slice(0, -suffix.length).trim() : title;
}

/**
 * True for a title shape that is a stock-quote/company-reference page, not a
 * news article — Reuters and Bloomberg both index these on the same domain
 * the `site:` queries are scoped to, and a handful rank for even the tightly
 * quoted `"Philippine Stock Exchange"` query since that phrase is literally
 * "Philippine Stock Exchange Inc"'s own company name. Live examples this
 * matches, all seen ranking for that exact query on 2026-08-07: bare tickers
 * (`"PSE.PS"`, `"BLOOM.PS"`, `"(.PSI)"`), Reuters' `"About <Company>
 * (<TICKER>)"` company pages, Reuters/Bloomberg's `"<TICKER>: <Company> Stock
 * Price Quote"` pages, and anything containing the boilerplate "Stock Price"
 * (Reuters titles every one of these `"... | Stock Price & Latest News"`).
 *
 * Deliberately narrow rather than trying to also catch a bare company name
 * with no ticker or boilerplate at all (Bloomberg's own quote pages are
 * sometimes titled just `"San Miguel Corp"`) — that shape is indistinguishable
 * from a legitimate short headline fragment without more signal than a title
 * alone provides, and this package's policy throughout (see
 * isBusinessRelevant) is to fail open rather than risk dropping a real story.
 * The 30-day + downstream 7-day recency windows (GOOGLE_NEWS_MAX_AGE_MS,
 * apps/web/lib/news.ts's MAX_AGE_MS) catch most of what slips past this on
 * their own, since these reference pages' `pubDate`s cluster years in the
 * past (checked live: 2014-2017 for the ones sampled), just not reliably
 * enough to skip this check — one bare-ticker page ("PSE.PS - Reuters") was
 * seen live with a `pubDate` inside the 30-day cutoff, evidently re-dated
 * whenever Google re-crawls it.
 */
export function isLikelyReferencePage(title: string): boolean {
  const trimmed = title.trim();
  if (/^\(?\.?[A-Z]{1,6}(\.[A-Z]{1,3})?\)?$/.test(trimmed)) return true; // "PSE.PS", "(.PSI)", "BLOOM.PS"
  if (/^About .+\([A-Z0-9.]{2,8}\)$/.test(trimmed)) return true; // "About Oriental Petroleum and Minerals Corp (OPMB.PS)"
  if (/stock price/i.test(trimmed)) return true; // "(ALI.PS) | Stock Price & Latest News", "ROCK: ... Stock Price Quote"
  if (/: profile and biography$/i.test(trimmed)) return true; // "Ramon S Monzon, Philippine Stock Exchange Inc: Profile and Biography"
  return false;
}

/**
 * True for a title that gives no indication the story is actually about the
 * Philippines — used to drop off-topic results a `site:`-scoped Google News
 * query still surfaces even when the query itself is an exact quoted phrase.
 *
 * Verified live 2026-08-08 while broadening outlets.ts's wire queries beyond
 * `"Philippine Stock Exchange"`: quoting a *common* macro phrase does not
 * reliably AND it against the domain the way the rarer PSE-specific phrase
 * did. `site:bloomberg.com "Philippine inflation"` (a query tried and
 * dropped, see outlets.ts) returned "Peru's Inflation Tops Forecasts...",
 * "Thai Inflation Eases to 1.95%...", "Zambia's Inflation Rate Holds
 * Steady...", "French Inflation Unexpectedly Accelerates..." and similar,
 * none of which contain "Philippine" anywhere — Google evidently still
 * broadens a `site:`-scoped quoted query by topic similarity once literal
 * matches run out, the same failure mode already documented for unquoted
 * queries, just less severe. Every one of those examples is caught by this
 * check; every genuine Philippine story sampled across `"Philippine
 * economy"`, `"Philippine peso"` and `"Philippine central bank"` (the
 * broadened queries actually shipped) said so directly in its own title.
 *
 * "Marcos" (Ferdinand Marcos Jr., the sitting president referenced in wire
 * headlines by surname alone) and "Manila" (the capital, standing in for the
 * country the way "Washington" or "Beijing" do in wire copy) are the two
 * recurring exceptions: live Bloomberg ("Marcos Fights to Revive Economy,
 * Presidency After Graft Debacle") and Business Times Singapore ("Can softer
 * delisting rules save Manila's bourse from hollowing out?") headlines were
 * genuine, on-topic PH economic/market stories with no "Philippine"/
 * "Philippines" token in the title at all. Neither name has a collision risk
 * worth guarding against here — no other head of state or national capital a
 * PSE tracker's wire/regional-business queries would plausibly surface
 * shares either one.
 */
export function isOffTopicForPhilippines(title: string): boolean {
  return !/philippin/i.test(title) && !/\bmarcos\b/i.test(title) && !/\bmanila\b/i.test(title);
}

/**
 * True for Google News' own `/rss/articles/...` redirect link, never for a
 * publisher's real article URL.
 *
 * Exported so etl/jobs/fetch-news.ts can skip its og:image fallback fetch for
 * these items specifically: live-tested 2026-08-07, fetching that link's
 * og:image returns Google News' own generic masthead image
 * (`og:site_name: "Google News"`), not the real article's photo, on every
 * item — because the link 302s to a same-origin `news.google.com`
 * interstitial that only reaches the actual publisher via client-side JS (see
 * outlets.ts's Google News section). Without this check, every image-less
 * Google-News-sourced item would silently get Google's own icon as its
 * thumbnail instead of falling through to the correct next fallback (that
 * outlet's real logo).
 */
export function isGoogleNewsRedirectUrl(url: string): boolean {
  try {
    return new URL(url).hostname === "news.google.com";
  } catch {
    return false;
  }
}

/**
 * Builds a NewsSource that reads *one or more* Google News search queries for
 * a single outlet, each scoped to that outlet's domain via a `site:` query
 * term, and merges the results (see outlets.ts for the actual queries chosen
 * and why — as of 2026-08-08 every outlet here runs 4 queries, not 1).
 *
 * **Why one source fans out over several queries internally, rather than
 * outlets.ts listing one `createGoogleNewsSource` entry per query (the
 * simpler-looking option, and the one this file used when there was only a
 * single query per outlet).** Live-tested while broadening the query set:
 * broader phrases legitimately overlap — the same Bloomberg article ("PHP/USD:
 * Philippine Peso Declines to Match Record Low on Higher Oil Prices") ranked
 * for both the `"Philippine peso"` and `"Philippine central bank"` queries,
 * confirmed byte-for-byte identical `<link>` (same Google News redirect ID,
 * not just the same headline) in both result sets. Separate `NewsSource`
 * entries per query would hand fetch-news.ts's flat `items` array two rows
 * with the same `url` in a single run, and that array goes into one bulk
 * `insert(...).onConflictDoUpdate(...)` — Postgres rejects that outright
 * ("ON CONFLICT DO UPDATE command cannot affect row a second time"), which
 * would fail the *entire* upsert for every outlet in that run, not just this
 * one's duplicate row. De-duping here, before anything reaches fetch-news.ts,
 * is what keeps the multi-query design safe to use at all.
 *
 * `outletName` is this package's own clean display name (e.g. `"Bloomberg"`,
 * not Google's own `"Bloomberg.com"`) — stored on every NewsItem regardless
 * of small variance in what Google's `<source>` element says per-item, so a
 * card's byline and fetch-news.ts's outlet-logo cache key
 * (news_outlet_logos, keyed by `source`) both stay stable and correctly
 * branded. `homepageUrl` should be that outlet's real site root (not
 * Google's), for the same fetchOutletLogo lookup rssSource.ts's
 * deriveHomepageUrl exists for.
 */
export function createGoogleNewsSource(
  outletName: string,
  homepageUrl: string,
  searchQueries: string[]
): NewsSource {
  return {
    name: outletName,
    homepageUrl,
    async fetchLatest(): Promise<NewsItem[]> {
      const cutoff = Date.now() - GOOGLE_NEWS_MAX_AGE_MS;

      // Promise.allSettled, not Promise.all: one query 4xx-ing or timing out
      // shouldn't cost this outlet its other 3 queries' results too — the
      // same "a single failure degrades, it doesn't cascade" shape
      // fetch-news.ts already applies one level up, across outlets.
      const feeds = await Promise.allSettled(
        searchQueries.map((query) => parser.parseURL(buildSearchUrl(query)))
      );

      // De-duped by URL across every query this outlet runs — see this
      // function's own doc comment for why that's required, not optional,
      // once an outlet has more than one query. A Map preserves first-seen
      // insertion order, which is arbitrary across queries anyway (each is
      // its own independently-ranked search), so no ordering guarantee is
      // lost by resolving a duplicate to whichever query happened to list it
      // first.
      const items = new Map<string, NewsItem>();

      for (const feed of feeds) {
        if (feed.status === "rejected") continue;
        for (const item of feed.value.items ?? []) {
          if (!item.link || !item.title || items.has(item.link)) continue;

          const publishedAt = parsePublishedAt(item.isoDate);
          if (publishedAt.getTime() < cutoff) continue;

          // Google's own attribution for this specific item, used only to
          // de-suffix the title accurately (see stripGoogleNewsTitleSuffix)
          // — falls back to our own outletName on the rare item missing
          // <source> entirely, which just means the suffix-strip becomes a
          // no-op for it.
          const rawSource = item.source ?? outletName;
          const title = stripGoogleNewsTitleSuffix(item.title, rawSource);
          if (isLikelyReferencePage(title)) continue;
          // Only matters for the broadened macro queries (a rare-phrase
          // query like "Philippine Stock Exchange" was never observed to
          // need this) but applied to every query uniformly rather than only
          // some, since it can only remove genuinely off-topic results — see
          // isOffTopicForPhilippines's own doc comment for live examples.
          if (isOffTopicForPhilippines(title)) continue;

          // Google News' <description> is not a real dek: it's the same
          // headline wrapped in an <a> tag plus the outlet name in a <font>
          // (confirmed live — every item's contentSnippet duplicated its own
          // title verbatim, e.g. "GCash parent Mynt looks to Philippine IPO
          // to raise up to $1.5 billion  Reuters"). There is nothing to
          // extract, so snippet stays null rather than showing that
          // duplication on the card, the same "omit rather than fake it"
          // contract wordCount/author already follow when a feed doesn't
          // carry the real thing.
          const combinedText = title;

          items.set(item.link, {
            source: outletName,
            title,
            snippet: null,
            // No enclosure/media:content in this feed at all (confirmed
            // live) — fetch-news.ts's og:image fallback is deliberately
            // skipped for these items too (isGoogleNewsRedirectUrl), so
            // these fall through to that job's third fallback, that outlet's
            // own logo, same as an RSS item whose feed carries no image
            // field (e.g. Philstar Business).
            imageUrl: null,
            // Google's own redirect link, not the resolved publisher URL —
            // see isGoogleNewsRedirectUrl's doc comment and outlets.ts for
            // why this is stored as-is rather than resolved further.
            url: item.link,
            publishedAt,
            tickers: tagTickers(combinedText),
            sentiment: scoreSentiment(combinedText).sentiment,
            // This feed carries no dc:creator/<author> at all — every item
            // is a wire byline at best, which the masthead-badge fallback
            // already covers via `source`.
            author: null,
            topic: classifyTopic(combinedText),
            // No content:encoded in this feed, so there's no body to count —
            // see NewsItem.wordCount's contract (omit the estimate, don't
            // guess it from the headline).
            wordCount: null,
          });
        }
      }

      return [...items.values()];
    },
  };
}
