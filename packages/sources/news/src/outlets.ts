import { createRssSource } from "./rssSource";
import type { NewsSource } from "./types";

/**
 * Adding/removing an outlet only touches this file. Confidence on each feed
 * URL varies — see notes. Verify before relying on an outlet in production
 * (Open Question #6/#7 in the project plan).
 *
 * Split into two tiers so the web app can render the reliable tier first and
 * stream the unverified tier in afterward, instead of blocking the whole
 * page on whichever feed is slowest — see apps/web/lib/news.ts.
 */

// Confirmed reachable at time of writing.
export const RELIABLE_NEWS_SOURCES: NewsSource[] = [
  createRssSource("BusinessWorld", "https://www.bworldonline.com/feed/"),
  createRssSource("GMA News Money", "https://data.gmanetwork.com/gno/rss/money/feed.xml"),
];

export const UNVERIFIED_NEWS_SOURCES: NewsSource[] = [
  // UNVERIFIED, confirmed BROKEN, kept only because Promise.allSettled in
  // apps/web/lib/news.ts already tolerates a permanently-failing source for
  // free. 2026-07-27 investigation: this feed is Cloudflare Bot
  // Management-protected and returns HTTP 403 on every fetch, live-tested
  // both with rss-parser's old default request (a literal, trivially
  // fingerprinted "User-Agent: rss-parser" - since fixed for every outlet,
  // see rssSource.ts's Parser config) and with a realistic browser
  // User-Agent/Accept header. The header fix alone wasn't enough here
  // specifically, unlike a plain curl with the identical header, which does
  // succeed - Cloudflare's bot scoring evidently also weighs TLS/IP
  // fingerprint, not just headers, and Node's https stack (what rss-parser
  // is built on) fingerprints differently from curl. Confirmed against the
  // real DB: 0 of 615 news_items rows on record were ever from this source.
  // Previously miscategorized as RELIABLE ("confirmed reachable at time of
  // writing") - that was never actually true; nothing here had been
  // re-verified since. Re-enabling for real would need a different HTTP
  // client with a browser-matching TLS fingerprint (e.g. curl-impersonate),
  // not a header change - not worth the added dependency weight for one
  // outlet when four others already work.
  createRssSource("Inquirer Business", "https://business.inquirer.net/feed"),

  // UNVERIFIED when this comment was first written ("philstar.com blocks
  // automated fetches from this environment"). Re-confirmed 2026-07-27 as
  // actually working fine: a live fetch (no special headers needed) returns
  // a full, valid feed, and the real DB has 58 recent Philstar Business rows
  // from it. Left in this tier rather than promoted to RELIABLE since a
  // WAF's behavior can vary run to run and this has had exactly one
  // successful verification, not sustained confirmation.
  createRssSource("Philstar Business", "https://www.philstar.com/rss/business"),

  // UNVERIFIED — Manila Bulletin's /rss page does not list a direct
  // business-category feed URL; this is a best-guess pattern. Re-confirmed
  // 2026-07-27 as working (51 real DB rows, all with images) - same caveat
  // as Philstar above about not promoting off a single successful check.
  createRssSource("Manila Bulletin Business", "https://mb.com.ph/rss/business/"),
];

export const NEWS_SOURCES: NewsSource[] = [
  ...RELIABLE_NEWS_SOURCES,
  ...UNVERIFIED_NEWS_SOURCES,
];
