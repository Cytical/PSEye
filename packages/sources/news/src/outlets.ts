import { createRssSource } from "./rssSource";
import { createGoogleNewsSource } from "./googleNewsSource";
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
  // outlet when seven others already work.
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

  // Added 2026-08-05 to broaden outlet coverage beyond the original four —
  // all three verified live via both a raw curl (browser User-Agent) and
  // the actual rss-parser code path with this file's real request headers
  // before being added, same bar as every other entry here. UNVERIFIED
  // rather than RELIABLE per this file's own policy: one clean check is a
  // starting point, not "sustained confirmation."
  //
  // Manila Times' /feed endpoint 404s; /business/feed is the real one and
  // is easily the highest-volume outlet checked (50 items per fetch vs.
  // 10-30 for everything else here).
  createRssSource("Manila Times Business", "https://www.manilatimes.net/business/feed"),
  // Rappler — one of the most-cited independent PH news outlets; its
  // business vertical has its own dedicated feed rather than needing a
  // category filter applied to the site-wide one.
  createRssSource("Rappler Business", "https://www.rappler.com/business/feed/"),
  createRssSource("Malaya Business Insight", "https://malaya.com.ph/feed/"),

  // Added 2026-08-08. SunStar's own generic `/rss` path 404s — the site
  // (Arc XP-hosted, like several regional PH papers) instead exposes one
  // feed per content collection at `/api/v1/collections/<slug>.rss`,
  // discovered by grepping the homepage HTML for its own `<a>` link to
  // `home.rss` and guessing `business.rss` from that pattern (confirmed
  // live via curl and the real rss-parser code path with this file's
  // headers: 40 items, real content:encoded bodies, real PH business
  // reporting — CBRE market briefings, PDIC depositor-protection rules,
  // factory output data, DTI trade missions). No dc:creator/author field in
  // this feed (it ships Atom's `<atom:author>` instead, which this
  // package's customFields don't request — see rssSource.ts), so bylines
  // stay null here, same as Philstar/GMA/Manila Bulletin.
  //
  // One caveat worth flagging rather than silently accepting: SunStar's URL
  // scheme files everything under a city/region segment first
  // (`/cebu/...`, `/davao/...`, `/philippines/...`), never a clean
  // `/business/...` prefix the way BusinessWorld/Manila Times do — so
  // isBusinessRelevant's path-segment filter (relevance.ts), which depends
  // on segments like `/opinion/` or `/showbiz/` appearing in the URL, can't
  // catch anything here even if this collection ever includes an
  // off-business item. One of the 40 sampled items, "Batuhan: The room
  // without puppet strings" (`/cebu/batuhan-the-room-without-puppet-
  // strings`), reads like a personal column rather than reporting — kept
  // anyway, since it's 1 of 40 (a lower noise ratio than Malaya/BusinessWorld
  // had before their own filtering) and SunStar's own CMS, not this file,
  // is the one deciding what belongs in its Business collection — the same
  // trust extended to Manila Times Business/Rappler Business's own dedicated
  // business feeds elsewhere in this file.
  createRssSource("SunStar Business", "https://www.sunstar.com.ph/api/v1/collections/business.rss"),

  // NOT added despite a working feed: BusinessMirror
  // (businessmirror.com.ph/feed/) is behind a Cloudflare Turnstile
  // JS-challenge ("Just a moment...") that a plain HTTP client can't clear
  // — same class of failure as Inquirer Business above, confirmed live via
  // curl before attempting rss-parser. ABS-CBN News
  // (news.abs-cbn.com/rss/*) returns a flat 403 on every path tried. Both
  // would need a different HTTP client (e.g. curl-impersonate) to work,
  // not a header change — revisit only if that becomes worth the added
  // dependency weight for two outlets when seven others already work.

  // Added 2026-08-07: international wire coverage of PSE/PH stocks, via
  // Google News search-as-RSS rather than each outlet's own feed. Reuters
  // killed its public RSS feeds around 2020 (a paid Reuters Connect license
  // is out of scope for this project); Bloomberg and Nikkei Asia have never
  // published a public feed at all. Google News' `/rss/search?q=...`
  // endpoint (createGoogleNewsSource, googleNewsSource.ts) is free,
  // unauthenticated, and surfaces exactly these outlets' own headlines
  // whenever they cover something the query matches.
  //
  // **What the live endpoint actually looks like (verified 2026-08-07,
  // don't assume this from training data — it has changed shape before):**
  // `https://news.google.com/rss/search?q=<query>&hl=en-PH&gl=PH&ceid=PH:en`.
  // Each `<item>`'s `<title>` is `"<Headline> - <Publisher>"`; `<source
  // url="https://www.reuters.com">Reuters</source>` gives the real outlet
  // name and homepage separately from the title (used by
  // stripGoogleNewsTitleSuffix and createGoogleNewsSource — see that file).
  // `<description>`/contentSnippet is *not* a real dek: it's the same
  // headline re-wrapped in an `<a>` plus the outlet name in a `<font>` tag,
  // so this source stores `snippet: null` rather than showing that
  // duplication on a card.
  //
  // **`<link>` is the significant behavior change from what this endpoint
  // used to do.** It is no longer a plain 302 straight to the publisher.
  // Live-tested: `curl`ing a `<link>` value returns a 302 whose `Location`
  // points back at itself (`news.google.com/rss/articles/...` again, just
  // with `hl`/`gl`/`ceid` appended) — an interstitial, not the article. A
  // real browser (tested with Playwright/Chromium) does reach the correct
  // publisher URL after ~2-3s, because that interstitial page's own JS does
  // a second, client-side redirect once it resolves an internal ID; a plain
  // HTTP client never sees that JS run. The base64 blob in the URL no
  // longer contains a recoverable plaintext URL either (checked: decoding
  // it now yields an opaque protobuf-shaped blob, not the readable URL
  // string older Google News links used to embed) — so there is no cheap
  // way to resolve the real article URL server-side without either running
  // a real browser per item (too heavy for an hourly ETL job fetching
  // dozens of items) or reverse-engineering Google's internal batchexecute
  // decode endpoint (unofficial, fragile, and out of scope). Per the
  // project's explicit sign-off, this source stores the raw `<link>` as-is:
  // it is a real, working URL — a human clicking "Read on Reuters" lands on
  // the correct article after a brief redirect through a Google News page,
  // exactly the way clicking a Google News search result in a browser
  // always has. The only cost is that extra hop is visible (URL bar shows
  // news.google.com briefly) rather than an instant direct link, and
  // fetch-news.ts's og:image fallback has to be skipped for these items
  // specifically (isGoogleNewsRedirectUrl) since fetching that interstitial
  // page's og:image returns Google News' own generic masthead image, not
  // the article's.
  //
  // **Query design and tiering.** Preferred several outlet-scoped queries
  // over one broad "Google News" source, mirroring this file's
  // one-entry-per-outlet convention — each is independently tunable/
  // removable. Every query is a quoted exact phrase (never unquoted) —
  // live-tested extensively before landing here:
  //   - Unquoted queries (`site:reuters.com Philippine stock market`,
  //     `site:bloomberg.com Philippines stocks`, etc.) return real
  //     PSE-relevant pieces mixed with unrelated wire copy that merely
  //     shares a word with the query — "Low Danube water levels in
  //     Bulgaria expose Roman-era bridge - Reuters" and "China dismisses
  //     Philippine education concerns as 'political provocation' - Reuters"
  //     both matched a "Philippine stock market" query live. Google News'
  //     `site:` search evidently does not AND multi-word queries the way a
  //     literal site search would.
  //   - Ticker-ish queries (`site:reuters.com PSEi`, `site:bloomberg.com
  //     PSEi`) return that outlet's own stock-quote/company-profile
  //     reference pages ("(.PSI) | Stock Price & Latest News - Reuters",
  //     "San Miguel Corp - Bloomberg.com") — not articles at all, most
  //     dated 2014-2017 (a live company-quote page, evidently indexed once
  //     and never re-dated). `isLikelyReferencePage` in googleNewsSource.ts
  //     drops these at fetch time.
  //   - AP News (apnews.com) was tried and dropped entirely: every query
  //     variant tested (`"Philippine Stock Exchange"`, `PSEi`, `Philippine
  //     stocks`, `Philippine peso`, `Manila stocks`) returned either zero
  //     results or wall-to-wall unrelated Philippine politics/disaster
  //     coverage ("Strong quake kills 5...", "Ex-Philippine leader Duterte
  //     assails Marcos...") with no genuine PSE-specific piece in any
  //     sample. AP's wire evidently doesn't file PSE-specific market
  //     copy the way Reuters/Bloomberg/Nikkei Asia do; there was nothing
  //     real to scope a query onto.
  //
  // **Broadened 2026-08-08 from one query per outlet to four**, after the
  // original single query — `site:<domain> "Philippine Stock Exchange"` —
  // was confirmed too narrow: it's a rare phrase even for outlets that cover
  // PH markets regularly (Reuters/Nikkei's most recent hits at the time were
  // 3 and 7 weeks old respectively), because a wire story about a rate
  // decision, the peso, or GDP rarely also says the exchange's full legal
  // name. Each outlet now runs all four of:
  //   - `"Philippine Stock Exchange"` (kept — still occasionally the best
  //     hit, e.g. Bloomberg's "Philippine Bourse Seeks to Boost Retail
  //     Trading With New Reforms")
  //   - `"Philippine economy"`
  //   - `"Philippine peso"`
  //   - `"Philippine central bank"`
  // Chosen from a longer live-tested candidate list (see
  // isOffTopicForPhilippines's doc comment and the rejects below) as the
  // phrases that are both common enough for these wires to actually write
  // and specific enough not to need heavy post-filtering. **Even a quoted
  // exact phrase isn't airtight once it's a common macro term, not a rare
  // proper noun** — `site:reuters.com "Philippine economy"` returned real
  // Reuters pieces with zero "Philippine" in the title ("IMF says oil
  // prices, weak monsoon pose biggest risks to India's FY27 GDP growth",
  // "Shared beds, shrinking budgets: China's young workers feel economic
  // squeeze"), and `site:bloomberg.com "Philippine inflation"` (tried,
  // rejected — see below) returned mostly *other countries'* inflation
  // stories (Peru, Thailand, Zambia, France). Google evidently still
  // broadens a `site:`-scoped quoted query by topic similarity once literal
  // matches thin out, the same failure mode as the unquoted case above, just
  // rarer and easier to miss in a small manual sample. `googleNewsSource.ts`
  // now runs `isOffTopicForPhilippines` (require "Philippin", "Marcos", or
  // "Manila" somewhere in the title — see that function's own doc comment
  // for live examples of each) as a mandatory post-filter on every Google
  // News query, not just the broadened ones, to catch this.
  //
  // Candidates tried and dropped for adding negligible or zero real volume
  // once the 30-day write-side window is applied (`GOOGLE_NEWS_MAX_AGE_MS`
  // in googleNewsSource.ts): `"Philippines GDP"` (mostly journalist
  // author-archive pages and, oddly, wrong-country pieces — "Vietnam Economy
  // Expands...", "Mexican Economy Beats Expectations..." — same broadening
  // artefact as above), `"Philippine stocks"`, `"Philippine markets"`,
  // `"Philippine stock market"` (quoted — 0 items inside 30 days for all
  // three outlets, every one tested), `"Philippine inflation"` (noisy per
  // above, and its two genuine hits were already reachable via the
  // "central bank"/"economy" queries anyway — no incremental volume for the
  // added noise), and `"Manila stocks"` (0 results outright for all three
  // outlets — these wires evidently never phrase it that way).
  //
  // **Multiple queries per outlet needed a source-level change, not just a
  // config change** — see createGoogleNewsSource's own doc comment in
  // googleNewsSource.ts for why results are merged/de-duped by URL inside
  // one source's fetchLatest rather than by listing 4 separate
  // createGoogleNewsSource entries per outlet here (a real, live-confirmed
  // duplicate-URL bug that would otherwise crash fetch-news.ts's bulk
  // upsert).
  //
  // **Volume, re-measured 2026-08-08 with the new 4-query set (all four
  // queries, de-duped, isLikelyReferencePage + isOffTopicForPhilippines
  // applied, exactly what production runs) — replaces the old "known
  // limitation: low bursty volume, zero items in the 7-day window" numbers,
  // which were true of the single-query design and are no longer the
  // current shape:**
  //   - Reuters: 2 stories within the 7-day display window (MAX_AGE_MS in
  //     apps/web/lib/news.ts), both filed within the last 36h, both from
  //     `"Philippine economy"` (a same-day GDP release, covered in two
  //     separate Reuters wire pieces).
  //   - Bloomberg: 11 stories within 30 days (2 of those within 7 days) —
  //     easily the highest-volume of the three, spread across all four
  //     queries (peso, central bank, and economy each contributed multiple
  //     distinct stories; the Stock Exchange query added one the others
  //     didn't reach).
  //   - Nikkei Asia: 3 stories within 30 days (2 within 7 days), all from
  //     `"Philippine economy"`.
  //   - Business Times Singapore: 6 stories within 30 days (2 within 7
  //     days) — see below for why this outlet is included in the Google
  //     News tier at all.
  //   - Total: 22 stories within 30 days, 8 within the 7-day display window,
  //     across a single point-in-time check — still event-driven rather
  //     than a steady daily beat (a quiet week can still contribute zero),
  //     but a real, non-trivial improvement over the single-query,
  //     three-outlet design's observed zero, and every one of the 22 a
  //     genuine on-topic PH business/economy story with no garbage in the
  //     sample.
  //
  // UNVERIFIED rather than RELIABLE per this file's own policy — Google
  // News' own infrastructure is about as durable a dependency as exists,
  // but the actual query results were only checked in two live sessions
  // (2026-08-07 for the original single-query design, 2026-08-08 for the
  // broadened one), which is this file's own bar for "not yet sustained
  // confirmation."
  createGoogleNewsSource("Reuters", "https://www.reuters.com", [
    'site:reuters.com "Philippine Stock Exchange"',
    'site:reuters.com "Philippine economy"',
    'site:reuters.com "Philippine peso"',
    'site:reuters.com "Philippine central bank"',
  ]),
  createGoogleNewsSource("Bloomberg", "https://www.bloomberg.com", [
    'site:bloomberg.com "Philippine Stock Exchange"',
    'site:bloomberg.com "Philippine economy"',
    'site:bloomberg.com "Philippine peso"',
    'site:bloomberg.com "Philippine central bank"',
  ]),
  createGoogleNewsSource("Nikkei Asia", "https://asia.nikkei.com", [
    'site:asia.nikkei.com "Philippine Stock Exchange"',
    'site:asia.nikkei.com "Philippine economy"',
    'site:asia.nikkei.com "Philippine peso"',
    'site:asia.nikkei.com "Philippine central bank"',
  ]),

  // Business Times Singapore — added 2026-08-08 alongside the wire-query
  // broadening above, and deliberately *also* via the Google News `site:`
  // pattern rather than its own RSS feed, even though a real dedicated feed
  // exists. (`businesstimes.com.sg/rss` itself is just an HTML feed
  // *directory* page, not a feed — it redirects to `/rss-feeds` and lists
  // one real feed per section; `/rss/asean-business` is the one checked
  // here, live-verified: 31 items, daily cadence, real content.) Live-sampled
  // that feed directly first: it is a genuine regional business desk, not
  // PH-specific — of 15 items sampled, 3 were Philippines stories
  // ("Philippine economy posts slowest growth...", "Philippine annual
  // inflation slows to 6.2%...") and the rest were
  // Malaysia/Indonesia/Vietnam/Thailand. Piping the raw feed in would mean
  // this outlet dilutes /news with non-PH regional coverage the same way
  // Malaya's site-wide feed once diluted it with showbiz and
  // cartoons (see relevance.ts's doc comment) — except there's no URL-path
  // trick available here the way isBusinessRelevant uses for Malaya, since
  // every item shares one regional-business path regardless of country. The
  // Google News `site:businesstimes.com.sg` queries (the same four phrases
  // as the wire sources) solve exactly this: they surface only this
  // outlet's PH-relevant pieces, several of them genuinely distinct from
  // anything Reuters/Bloomberg/Nikkei ran — "Can softer delisting rules save
  // Manila's bourse from hollowing out?", "Private equity, tycoons fuel
  // Philippines' US$30 billion healthcare boom", "Del Monte Pacific defends
  // going-concern status after SGX flags US$787m net current liabilities"
  // (a PSE-listed company, tagged automatically once tagTickers runs over
  // the title). The "Manila" marker in isOffTopicForPhilippines
  // (googleNewsSource.ts) exists specifically because of the delisting-rules
  // headline above, which has no "Philippine"/"Marcos" token at all.
  createGoogleNewsSource("Business Times Singapore", "https://www.businesstimes.com.sg", [
    'site:businesstimes.com.sg "Philippine Stock Exchange"',
    'site:businesstimes.com.sg "Philippine economy"',
    'site:businesstimes.com.sg "Philippine peso"',
    'site:businesstimes.com.sg "Philippine central bank"',
  ]),

  // **Other PH/SEA outlets evaluated 2026-08-08 and dropped** (live-tested
  // with a realistic browser User-Agent/Accept header — see
  // rssSource.ts's FEED_REQUEST_HEADERS — either via curl or the actual
  // rss-parser code path, same bar as everything above):
  //
  // - SunStar (sunstar.com.ph) — kept, see above; not a reject.
  // - Manila Standard (manilastandard.net) — `/feed` 301-redirects straight
  //   back to the homepage, with `X-Redirect-By: Yoast SEO: We disable the
  //   RSS feed for performance reasons.` in the response headers. A
  //   deliberate, site-wide choice by the outlet, not a fetch/WAF problem —
  //   there is no feed to find here.
  // - Philippine News Agency (pna.gov.ph) — the *homepage itself* returns
  //   HTTP 403 to a realistic browser User-Agent, not just an RSS path,
  //   which rules out discovering any feed URL at all. Same failure class
  //   as ABS-CBN (see the reject note above), not re-attempted further per
  //   that same reasoning.
  // - Jakarta Post (thejakartapost.com) and Jakarta Globe (jakartaglobe.id)
  //   — both homepages load fine (200), but neither exposes any discoverable
  //   RSS link (`grep`-ed the homepage HTML for `rss`/`feed` hrefs — nothing
  //   in either), and every guessed conventional path (`/feed`, `/rss.xml`,
  //   `/business/rss`, `/business/feed`) 404s or, for Jakarta Globe's
  //   `/business/feed`, 410 Gone — a path that evidently existed once and
  //   was deliberately retired. No feed to add for either.
  // - Channel News Asia Business (channelnewsasia.com) — a real, working
  //   feed exists (`/api/v1/rss-outbound-feed?_format=xml&category=6936`,
  //   the correct category ID found via the site's own `/rss` listing page
  //   after an initially-guessed ID returned the wrong, general-news
  //   category). Sampled 20 items: zero were about the Philippines or even
  //   Southeast Asia — it's US/global tech and finance wire copy (Nvidia,
  //   OpenAI, Airbnb, Meta). Checked the Google-News `site:` fallback too,
  //   the way Business Times Singapore is handled above: it does return a
  //   handful of PH items, but every one is a Reuters wire piece
  //   re-syndicated onto CNA's own domain, word-for-word the same stories
  //   the Reuters source above already carries under its own byline — no
  //   incremental coverage, just a second URL for the same story. Not
  //   added via either path.
  // - Bangkok Post Business (bangkokpost.com) — a real, working, daily feed
  //   (`/rss/data/business.xml`), but purely Thailand-domestic (SET-listed
  //   companies, Thai fuel subsidies, egg prices) with zero Philippines
  //   content in a 10-item sample. Unlike Business Times Singapore, the
  //   Google-News `site:` fallback came back empty too (0 items within 30
  //   days for both `"Philippine Stock Exchange"` and `"Philippine
  //   economy"`) — Bangkok Post evidently doesn't cover PH markets at all,
  //   regionally or otherwise. Not added via either path.
  // - DealStreetAsia (dealstreetasia.com/feed) — 503 on every attempt, both
  //   on the first try and on a follow-up redirect-following retry. Dropped
  //   without further digging per this task's own instruction not to spend
  //   long on a source that fails its first check.
];

export const NEWS_SOURCES: NewsSource[] = [
  ...RELIABLE_NEWS_SOURCES,
  ...UNVERIFIED_NEWS_SOURCES,
];
