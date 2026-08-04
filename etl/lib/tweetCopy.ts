/**
 * Pure tweet-copy builders for etl/jobs/post-daily-tweet.ts — kept dependency-free
 * (no DB/network/Twitter client) so they're unit-testable the same way this repo
 * tests every other bit of pure logic (parseMarketWatchPdf, lib/dca.ts, etc.).
 */

/** X (Twitter) counts any http(s) URL as exactly 23 chars via t.co, regardless
 * of its real length — used to estimate whether a candidate tweet fits 280. */
const TCO_URL_LENGTH = 23;
const MAX_TWEET_LENGTH = 280;
const URL_PATTERN = /https?:\/\/\S+/g;

export function estimateTweetLength(text: string): number {
  const urlCount = (text.match(URL_PATTERN) ?? []).length;
  const withoutUrls = text.replace(URL_PATTERN, "");
  return withoutUrls.length + urlCount * TCO_URL_LENGTH;
}

/** Appends as many trailing hashtags as fit under 280 (estimated), dropping
 * from the end first — the core message (link included) always wins. */
function fitHashtags(core: string, hashtags: string[]): string {
  for (let count = hashtags.length; count >= 0; count--) {
    const candidate = count > 0 ? `${core}\n\n${hashtags.slice(0, count).join(" ")}` : core;
    if (estimateTweetLength(candidate) <= MAX_TWEET_LENGTH) return candidate;
  }
  return core;
}

function formatIndexValue(value: number): string {
  return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

function formatSigned(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}`;
}

function formatCompactPeso(n: number): string {
  const abs = Math.abs(n);
  const sign = n < 0 ? "-" : "";
  if (abs >= 1e9) return `${sign}₱${(abs / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `${sign}₱${(abs / 1e6).toFixed(1)}M`;
  return `${sign}₱${Math.round(abs).toLocaleString("en-PH")}`;
}

export interface MapTweetInput {
  /** e.g. "Jul 27, 2026" */
  dateLabel: string;
  siteUrl: string;
  snapshot: { pseiValue: number; pseiChange: number; pseiPctChange: number } | null;
  breadth: { advancers: number; decliners: number; unchanged: number } | null;
}

// X's ranking model treats 3+ hashtags as a spam signal and measurably
// suppresses reach past that point, while 1-2 relevant tags still earn a
// small boost — that tradeoff is why this used to be capped at 2. Kept at 2
// on 2026-08-05 (account owner considered widening to 4 for discoverability
// but preferred staying under that spam-signal threshold, dropping #PSE and
// #StockMarketPH in favor of #PHStocks alongside #PSEi). Deliberately still
// topically relevant — no off-topic trending tags — since hijacking
// irrelevant trending hashtags reads as spam to X's ranking model and to
// real followers, on top of being against X's own hashtag-misuse guidance.
const MAP_HASHTAGS = ["#PSEi", "#PHStocks"];

/**
 * The main post: the market-map screenshot's caption, with a direct link.
 * X's pre-Oct-2025 algorithm heavily suppressed off-platform links in the
 * main post body; X's head of product announced that penalty lifted Oct 14,
 * 2025 (paired with an in-app link-preview webview so the click doesn't fully
 * exit the app) — confirmed by real before/after reach data, not just the
 * announcement itself. Link kept here rather than reply-only.
 */
export function buildMapTweetText({ dateLabel, siteUrl, snapshot, breadth }: MapTweetInput): string {
  const lines = [`🇵🇭 PSE Market Map — ${dateLabel}`];

  if (snapshot) {
    const arrow = snapshot.pseiPctChange >= 0 ? "🟢▲" : "🔴▼";
    lines.push(
      `PSEi ${formatIndexValue(snapshot.pseiValue)} ${arrow} ${formatPct(snapshot.pseiPctChange)} (${formatSigned(snapshot.pseiChange)} pts)`
    );
  }

  if (breadth) {
    lines.push(`${breadth.advancers}🟢 advancers · ${breadth.decliners}🔴 decliners · ${breadth.unchanged} flat`);
  }

  lines.push("", "Every PSE stock, sized by market cap & colored by today's move — free, no login:", siteUrl);

  return fitHashtags(lines.join("\n"), MAP_HASHTAGS);
}

/** Alt text for the uploaded screenshot — accessibility + a second, crawlable description of the image. */
export function buildMapAltText(dateLabel: string): string {
  return `PSE Market Map for ${dateLabel}: every Philippine Stock Exchange stock, sized by market capitalization and colored by today's percentage change, grouped by sector.`;
}

export interface RecapReplyInput {
  /** ISO yyyy-mm-dd, for the /daily/[date] link. */
  date: string;
  siteUrl: string;
  topGainer: { ticker: string; pctChange: number } | null;
  topLoser: { ticker: string; pctChange: number } | null;
  topForeignBuy: { ticker: string; netValue: number } | null;
  topForeignSell: { ticker: string; netValue: number } | null;
}

// See MAP_HASHTAGS above for the reach-vs-discoverability tradeoff rationale.
const RECAP_HASHTAGS = ["#PSEi", "#PHStocks"];

/**
 * The reply: the day's recap, with a link to the full /daily/[date] page.
 * The link belongs here, not on the parent post — see buildMapTweetText.
 */
export function buildRecapReplyText({
  date,
  siteUrl,
  topGainer,
  topLoser,
  topForeignBuy,
  topForeignSell,
}: RecapReplyInput): string {
  const lines = ["📊 Today's recap:"];

  if (topGainer) lines.push(`🟢 Top gainer: ${topGainer.ticker} ${formatPct(topGainer.pctChange)}`);
  if (topLoser) lines.push(`🔴 Top loser: ${topLoser.ticker} ${formatPct(topLoser.pctChange)}`);
  if (topForeignBuy) lines.push(`💰 Top foreign buy: ${topForeignBuy.ticker} ${formatCompactPeso(topForeignBuy.netValue)}`);
  if (topForeignSell)
    lines.push(`📤 Top foreign sell: ${topForeignSell.ticker} ${formatCompactPeso(Math.abs(topForeignSell.netValue))}`);

  // No movers/flow data landed yet (e.g. this ran before the daily ETL batch) —
  // still worth a reply pointing at the full page rather than skipping it.
  if (lines.length === 1) {
    lines.push("Full breakdown of breadth, movers, block sales & disclosures below.");
  }

  lines.push("", "Full daily recap →", `${siteUrl}/daily/${date}`);

  return fitHashtags(lines.join("\n"), RECAP_HASHTAGS);
}
