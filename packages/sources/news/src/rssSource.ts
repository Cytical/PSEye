import Parser from "rss-parser";
import type { NewsItem, NewsSource } from "./types";
import { tagTickers } from "./tickerTagger";
import { scoreSentiment } from "./sentiment";
import { classifyTopic } from "./topics";
import { isBusinessRelevant } from "./relevance";

// Extra fields not in rss-parser's default Item shape, needed to recover a
// thumbnail image — most PH outlet feeds carry it as media:content (Media
// RSS) or content:encoded (an inline <img> in the full-content HTML) rather
// than the plain <enclosure> the base type already covers.
interface RssImageFields {
  "media:content"?: { $?: { url?: string } } | Array<{ $?: { url?: string } }>;
  "content:encoded"?: string;
}

// rss-parser maps <dc:creator> onto `creator` on its own, but only when the
// feed declares the Dublin Core namespace the way it expects; the raw key is
// kept here as a fallback so a feed that declares it unusually still yields a
// byline rather than silently dropping to null.
interface RssAuthorFields {
  "dc:creator"?: string;
  /** RSS 2.0's own <author>, which rss-parser's Item type doesn't declare.
   * Conventionally an email with the name in parentheses. */
  author?: string;
}

type RssExtraFields = RssImageFields & RssAuthorFields;

// Bounds how long a single outlet can block a fetch. Without it, an
// unreachable feed (see the UNVERIFIED outlets in outlets.ts) hangs on the
// default socket timeout instead of failing fast enough to stream around.
//
// `headers` overrides rss-parser's own default request headers
// (`User-Agent: 'rss-parser'`, `Accept: 'application/rss+xml'`) — confirmed
// live that this literal default User-Agent is exactly why
// "Inquirer Business" (Cloudflare-protected) silently returned zero items on
// *every* run despite being in the RELIABLE tier: Cloudflare served its
// "Just a moment..." JS-challenge HTML page instead of the feed XML, which
// rss-parser's XML parser then fails on — a rejection Promise.allSettled
// swallows in fetchFrom (apps/web/lib/news.ts), so it never surfaced as
// anything louder than a console.error in the ETL job. A realistic browser
// User-Agent (and a broader Accept header some feeds' WAFs also key off)
// clears the challenge. This is the actual mechanism behind "sometimes the
// news data doesn't get received" — not occasional flakiness, a 100%,
// silent failure rate for that one outlet.
const parser = new Parser<Record<string, unknown>, RssExtraFields>({
  timeout: 8_000,
  headers: {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    Accept: "application/rss+xml, application/xml, text/xml, */*",
  },
  customFields: {
    item: ["media:content", "content:encoded", "dc:creator"],
  },
});

/**
 * Longer than the 240 this used to be. The dek now runs under every card on
 * /news rather than only the hero, and 240 characters was landing about two
 * words short of the end of a second sentence for most outlets, so the extra
 * room buys a complete thought far more often than it buys a longer
 * paragraph.
 */
const SNIPPET_MAX_LENGTH = 340;

/**
 * How far back from the hard cap a sentence end still counts as a clean
 * place to stop. Beyond this the snippet would be noticeably shorter than
 * its neighbours on the page, which looks like missing data rather than an
 * editing decision, so past this point it falls through to a word break.
 */
const SENTENCE_BREAK_WINDOW = 110;

/**
 * Turns feed HTML into a plain-text dek that ends somewhere a person would
 * have ended it.
 *
 * The old version cut at a fixed character count, which is why real stored
 * snippets ended mid-word ("covering the Ju…", "for the first time, with his
 * net worth nearly doubling to a record $21.8 billion a…"). It now prefers,
 * in order: the whole text if it fits, the last sentence end within the
 * window, then the last word boundary. Only a single unbroken 340-character
 * token falls through to a hard slice.
 */
export function stripHtmlAndTruncate(
  input: string | undefined,
  maxLength = SNIPPET_MAX_LENGTH
): string | null {
  if (!input) return null;
  const text = input
    .replace(/<[^>]*>/g, " ")
    // Feed HTML is full of &nbsp; and stray newlines from the CMS; collapsing
    // here (rather than leaving it to CSS) keeps the stored value clean for
    // sentiment/ticker matching too, both of which run over this string.
    .replace(/&nbsp;?/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;
  // Shorter than the cap, so nothing here truncated it — but the outlet's own
  // CMS may already have. Manila Bulletin and a few others ship a fixed-length
  // excerpt that stops mid-sentence ("...up 93 percent from P2.10 billion a"),
  // and without a mark that reads on the page as a typo rather than as an
  // excerpt. Anything already ending in terminal punctuation is left exactly
  // as the outlet wrote it.
  if (text.length <= maxLength) return /[.!?…:;)"'’”]$/.test(text) ? text : `${text}…`;

  const window = text.slice(0, maxLength);

  const sentenceEnd = lastSentenceEnd(window);
  if (sentenceEnd >= maxLength - SENTENCE_BREAK_WINDOW) return window.slice(0, sentenceEnd + 1).trim();

  const lastSpace = window.lastIndexOf(" ");
  if (lastSpace > 0) return `${window.slice(0, lastSpace).trim()}…`;
  return `${window.slice(0, maxLength - 1)}…`;
}

/**
 * Abbreviations that end in a period without ending a sentence. Business
 * copy is unusually dense in them: almost every company name carries one,
 * and PH bylines carry "Jr." constantly.
 */
const NON_TERMINAL_ABBREVIATIONS = new Set([
  "jr", "sr", "mr", "mrs", "ms", "dr", "prof", "gen", "sen", "rep", "gov",
  "atty", "engr", "st", "ave", "blvd", "no", "vs", "est", "approx",
  "inc", "corp", "co", "ltd", "plc", "bros", "assn", "dept", "univ",
  "jan", "feb", "mar", "apr", "jun", "jul", "aug", "sept", "sep", "oct", "nov", "dec",
]);

/** Index of the final sentence-ending punctuation mark in `text`, or -1. */
function lastSentenceEnd(text: string): number {
  for (let i = text.length - 1; i >= 1; i--) {
    const char = text[i];
    if (char !== "." && char !== "!" && char !== "?") continue;
    const after = text[i + 1];
    // Mid-string, a real sentence end is always followed by a space. At the
    // very end of the window there is nothing after it, which is fine.
    if (after !== undefined && after !== " ") continue;
    if (char === "." && !endsSentenceHere(text, i)) continue;
    return i;
  }
  return -1;
}

/** Whether the period at `index` terminates a sentence, as opposed to
 * sitting inside a decimal ("P8.31"), an initial ("Enrique R. Razon") or a
 * known abbreviation ("Jr.", "Inc."). */
function endsSentenceHere(text: string, index: number): boolean {
  const before = text[index - 1];
  if (/[0-9]/.test(before) && /[0-9]/.test(text[index + 1] ?? "")) return false;

  // The run of letters immediately preceding the period.
  let start = index;
  while (start > 0 && /[A-Za-z]/.test(text[start - 1])) start--;
  const word = text.slice(start, index);
  if (word.length === 0) return true;
  // A single letter is an initial ("Enrique R. Razon"), not a sentence.
  if (word.length === 1) return false;
  return !NON_TERMINAL_ABBREVIATIONS.has(word.toLowerCase());
}

/**
 * CMS artefacts that occupy the author field without being a byline.
 * "newspublish" is Inquirer's publishing robot; the rest are the usual
 * WordPress defaults.
 */
const PLACEHOLDER_AUTHORS = new Set([
  "admin", "administrator", "editor", "staff", "webmaster", "author", "news",
  "newspublish", "newsroom", "online team", "web team", "correspondent",
]);

/**
 * The byline, from dc:creator (rss-parser surfaces it as `creator`; the raw
 * field name is kept as a fallback for any feed it doesn't map).
 *
 * Most of this function is rejection, because what the feeds put in this
 * field is not uniformly a byline. Checked against the live values: Inquirer
 * publishes editor logins ("clopez", "jbarrion", "jcristobal") and a robot
 * account ("NewsPublish"); Malaya publishes its own masthead and, on one
 * item, literally "___". A byline reading "By jbarrion" is worse than no
 * byline at all, so anything that fails to look like a person or an agency
 * returns null and the card falls back to the masthead it already shows.
 *
 * `outletName` is passed so an outlet crediting itself as the author
 * ("Malaya Business Insight") doesn't render as "By Malaya Business Insight
 * · Malaya Business Insight".
 */
function extractAuthor(item: Parser.Item & RssExtraFields, outletName: string): string | null {
  return cleanAuthorName((item.creator ?? item["dc:creator"] ?? item.author ?? "").toString(), outletName);
}

/** The rejection and normalisation half of extractAuthor, split out so it can
 * be tested against the real values the feeds send without having to build a
 * whole Parser.Item. */
/**
 * The story's publication time, never in the future and never invalid.
 *
 * Inquirer Business stamps items up to three hours ahead of real time
 * (measured live: 8 of its 243 stored rows were future-dated, the furthest by
 * 3h). Unclamped, those sit permanently at the top of anything sorted by
 * recency, which is how a single outlet came to occupy all four slots of
 * /news's "Latest" strip, and they render as "just now" for hours. Clamping
 * costs nothing for the ~99.6% of items whose stamp is already in the past.
 *
 * A missing or unparseable date still falls back to now, because there is
 * genuinely nothing better to use. That fallback is why the upsert in
 * etl/jobs/fetch-news.ts writes published_at with least() rather than
 * overwriting: re-stamping it every run would keep a dateless item
 * permanently newer than every real story.
 */
export function parsePublishedAt(isoDate: string | undefined, now = Date.now()): Date {
  if (!isoDate) return new Date(now);
  const parsed = new Date(isoDate).getTime();
  if (Number.isNaN(parsed)) return new Date(now);
  return new Date(Math.min(parsed, now));
}

export function cleanAuthorName(raw: string, outletName: string): string | null {
  // Some feeds prefix an email ("news@example.com (Jane Cruz)"), the RSS 2.0
  // <author> convention.
  const parenthesised = /\(([^)]+)\)\s*$/.exec(raw);
  const name = (parenthesised?.[1] ?? raw)
    .replace(/\s+/g, " ")
    // "Arceo,Allen Limos" — a missing space after a co-byline separator.
    .replace(/\s*,\s*/g, ", ")
    .trim();

  if (!name || name.length > 120) return null;
  if (!/\p{L}/u.test(name)) return null; // "___" and similar junk.
  if (PLACEHOLDER_AUTHORS.has(name.toLowerCase())) return null;
  if (name.toLowerCase() === outletName.toLowerCase()) return null;

  // A single all-lowercase token is a login, not a name. Two words are a
  // name typed carelessly ("christine fajardo"), which is worth keeping and
  // worth fixing. Wire services ("Reuters") survive because they are
  // capitalised.
  const words = name.split(" ");
  if (words.length === 1 && name === name.toLowerCase()) return null;
  if (name === name.toLowerCase()) return words.map(capitalise).join(" ");
  return name;
}

function capitalise(word: string): string {
  return word.length === 0 ? word : word[0].toUpperCase() + word.slice(1);
}

/**
 * Words in the full article body, when the feed ships one. Null rather than
 * 0 when it doesn't, so callers can tell "no body in the feed" apart from a
 * genuinely empty one and omit the reading estimate instead of printing a
 * wrong "1 min read" (see NewsItem.wordCount).
 */
function countBodyWords(item: Parser.Item & RssExtraFields): number | null {
  const html = item["content:encoded"];
  if (!html) return null;
  const plain = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  if (!plain) return null;
  return plain.split(" ").length;
}

function extractImageUrl(item: Parser.Item & RssExtraFields): string | null {
  // Guard against non-image enclosures (podcast audio, PDFs, etc.) — an
  // <enclosure type="audio/mpeg"> rendered straight into <img src> is exactly
  // the "image doesn't load" failure mode this whole pass is fixing. No
  // outlet in outlets.ts is known to do this today, but nothing stops a feed
  // from adding one later, and the check is free.
  if (item.enclosure?.url && (!item.enclosure.type || item.enclosure.type.startsWith("image")))
    return item.enclosure.url;

  const media = item["media:content"];
  const mediaUrl = Array.isArray(media) ? media[0]?.$?.url : media?.$?.url;
  if (mediaUrl) return mediaUrl;

  // Last resort: pull the first <img> out of the full-content HTML, since a
  // handful of outlets only embed the thumbnail inline rather than as a
  // distinct feed field.
  const html = item["content:encoded"] ?? item.content ?? "";
  const match = /<img[^>]+src="([^"]+)"/i.exec(html);
  return match?.[1] ?? null;
}

/**
 * The feed URL's own origin (e.g. "https://www.bworldonline.com" from
 * ".../feed/") — used only as a best-effort homepage for
 * fetchOutletLogo (outletLogo.ts) to look at. Undefined rather than thrown
 * on a malformed feedUrl, since a missing homepage just means that outlet's
 * logo lookup is skipped (falls through to the initials placeholder), not
 * that source construction should fail.
 */
function deriveHomepageUrl(feedUrl: string): string | undefined {
  try {
    return new URL(feedUrl).origin;
  } catch {
    return undefined;
  }
}

/**
 * Builds a NewsSource from any standard RSS/Atom feed. Adding or removing an
 * outlet is a config change (see outlets.ts), never a change to callers.
 */
export function createRssSource(name: string, feedUrl: string): NewsSource {
  return {
    name,
    homepageUrl: deriveHomepageUrl(feedUrl),
    async fetchLatest(): Promise<NewsItem[]> {
      const feed = await parser.parseURL(feedUrl);

      return (feed.items ?? []).flatMap((item) => {
        if (!item.link || !item.title) return [];
        // Three of the configured feeds carry the whole newspaper, not just
        // its business desk. Dropped here rather than at render time so the
        // showbiz and editorial-cartoon items never cost an og:image fetch or
        // a DB row either. See relevance.ts.
        if (!isBusinessRelevant(item.link)) return [];

        const snippet = stripHtmlAndTruncate(item.contentSnippet ?? item.content);
        const publishedAt = parsePublishedAt(item.isoDate);
        const combinedText = `${item.title} ${snippet ?? ""}`;

        return [
          {
            source: name,
            title: item.title,
            snippet,
            imageUrl: extractImageUrl(item),
            url: item.link,
            publishedAt,
            tickers: tagTickers(combinedText),
            sentiment: scoreSentiment(combinedText).sentiment,
            author: extractAuthor(item, name),
            // Classified off headline + dek, the same text tagTickers and
            // scoreSentiment see, rather than off the feed's own <category>
            // tags — see topics.ts for why those are unusable here.
            topic: classifyTopic(combinedText),
            wordCount: countBodyWords(item),
          },
        ];
      });
    },
  };
}
