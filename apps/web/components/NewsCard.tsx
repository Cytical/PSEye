import Link from "next/link";
import { PSE_EDGE_COMPANIES } from "@pseye/source-quotes";
import { FALLBACK_TOPIC, formatReadingTime, type NewsCluster, type NewsItem } from "@pseye/source-news";
import type { MarketReactions } from "@/lib/news";
import { NewsThumbnail } from "./NewsThumbnail";

const TRACKED_TICKERS = new Set(PSE_EDGE_COMPANIES.map((c) => c.ticker));

/**
 * How much of a story a card shows, heaviest first.
 *
 * "lead" and "headline" were added when /news split into desk pages
 * (2026-08-07). The front page used to render every story at "compact",
 * i.e. thumbnail plus a three-line lede plus a byline, thirty-odd times over,
 * which is what made it read as a wall of text. A desk preview is now one
 * "lead" (the only card in the block carrying a lede) and four "headline"
 * rows, so each desk costs a reader one paragraph instead of five.
 */
type Variant = "hero" | "lead" | "secondary" | "compact" | "headline";

/** "3h ago" style timestamp, matching the FT convention this redesign follows. */
function formatTimeAgo(date: Date): string {
  const diffMinutes = Math.round((Date.now() - date.getTime()) / 60_000);
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

/**
 * The story's desk (see classifyTopic in @pseye/source-news), falling back to
 * its first tagged ticker and then to a generic label.
 *
 * Desk first because "ENERGY & POWER" tells a scanning reader what the story
 * is about, where a bare ticker only tells them who it is about, and the
 * ticker is repeated in the byline chips directly below anyway.
 * FALLBACK_TOPIC is skipped rather than printed: "GENERAL BUSINESS" over a
 * story on a business news page says nothing, and a ticker at least says who.
 */
function kickerFor(item: NewsItem): string {
  const desk = item.topic && item.topic !== FALLBACK_TOPIC ? item.topic : null;
  return desk ?? item.tickers[0] ?? "BUSINESS";
}

// FT house style: kickers run in claret with a thin claret rule beneath,
// not plain black — see apps/web/app/news/page.tsx's palette comment for the
// route-scoped hex values these mirror.
function Kicker({ text, className = "" }: { text: string; className?: string }) {
  return (
    <p
      className={`font-news-sans inline-block border-b-2 border-[#990F3D] pb-0.5 text-[11px] font-bold uppercase tracking-[0.1em] text-[#990F3D] dark:border-[#D75980] dark:text-[#D75980] ${className}`}
    >
      {text}
    </p>
  );
}

/**
 * Small per-article sentiment indicator (lexicon-scored at fetch time, see
 * scoreSentiment in packages/sources/news/src/sentiment.ts) — uses this
 * site's existing green=up/red=down semantic convention (the `text-up`/
 * `text-down` Tailwind theme colors defined from --up/--down in globals.css,
 * the same pair DailyRecapShareCard.tsx and every price-change display site-
 * wide already use) rather than inventing a news-specific palette, so it
 * reads as native to the site instead of bolted on. Neutral renders nothing:
 * most generic business headlines aren't emotionally loaded either
 * direction, so a badge on literally every card would be more noise than
 * signal — same reasoning the daily recap's breadth strip uses "48 flat" as
 * plain, unstyled text rather than giving "unchanged" its own color chip.
 *
 * Hidden until the card is hovered (`opacity-0 group-hover:opacity-100` —
 * the `group` class lives on the enclosing `<article>` in each card variant
 * below, not just the `<a>`, so hovering anywhere on the card counts, not
 * only the thumbnail/headline link). Pure CSS, no client component needed.
 * `title` stays set unconditionally so the sentiment is still discoverable
 * without a mouse (keyboard focus / assistive tech reading the attribute).
 */
function SentimentBadge({ sentiment }: { sentiment: NewsItem["sentiment"] }) {
  if (sentiment !== "positive" && sentiment !== "negative") return null;
  const isPositive = sentiment === "positive";
  return (
    <span
      className={`inline-flex items-center gap-0.5 font-mono text-[10px] font-semibold tracking-normal opacity-0 transition-opacity duration-150 group-hover:opacity-100 ${
        isPositive ? "text-up" : "text-down"
      }`}
      title={isPositive ? "Positive sentiment" : "Negative sentiment"}
    >
      {isPositive ? "▲" : "▼"} {isPositive ? "Positive" : "Negative"}
    </span>
  );
}

/**
 * A tagged company's ticker plus what its stock actually did today.
 *
 * This is the join /news exists to make and a general news site can't: the
 * headline says the company reported higher earnings, the chip says the
 * market marked it down 2.1% anyway. The percentage is omitted (leaving a
 * plain ticker chip, exactly as before) when there is no quote or the stock
 * did not trade, per Quote.price's "render N/A, never coerce to 0" contract.
 */
function TickerChip({ ticker, reaction }: { ticker: string; reaction: number | null | undefined }) {
  const tracked = TRACKED_TICKERS.has(ticker);
  const move = typeof reaction === "number" ? reaction : null;
  const moveClass = move === null ? "" : move > 0 ? "text-up" : move < 0 ? "text-down" : "";
  const body = (
    <>
      {ticker}
      {move !== null && (
        <span className={`ml-1 font-semibold ${moveClass}`}>
          {move > 0 ? "+" : ""}
          {move.toFixed(2)}%
        </span>
      )}
    </>
  );

  if (!tracked) {
    return (
      <span className="border border-[#990F3D]/25 px-1 py-px font-mono text-[10px] tracking-normal text-[#990F3D]/70 dark:border-[#D75980]/30 dark:text-[#D75980]/70">
        {body}
      </span>
    );
  }

  return (
    <Link
      href={`/stocks/${ticker}`}
      title={
        move === null
          ? `${ticker}: no trade to report today`
          : `${ticker} is ${move >= 0 ? "up" : "down"} ${Math.abs(move).toFixed(2)}% today`
      }
      className="border border-[#990F3D]/40 px-1 py-px font-mono text-[10px] tracking-normal text-[#990F3D] hover:border-[#990F3D] hover:bg-[#990F3D]/10 dark:border-[#D75980]/45 dark:text-[#D75980] dark:hover:border-[#D75980] dark:hover:bg-[#D75980]/15"
    >
      {body}
    </Link>
  );
}

function Byline({
  item,
  reactions,
  className = "",
  hideKickerTicker = false,
  terse = false,
}: {
  item: NewsItem;
  reactions?: MarketReactions;
  className?: string;
  /**
   * HeroCard/SecondaryCard render a Kicker above this byline. That kicker is
   * now the story's desk rather than its first ticker, so the chip list no
   * longer duplicates it and this defaults to keeping every ticker. Kept as a
   * prop because a variant may still want to suppress the lead ticker.
   */
  hideKickerTicker?: boolean;
  /**
   * Drops the author and the reading time, keeping only outlet, time and the
   * ticker chips.
   *
   * Set by HeadlineCard, which appears in stacks of three to a dozen. Full
   * bylines there ran to two wrapped lines of small caps under a single-line
   * headline, i.e. more metadata than story, which is the specific thing that
   * made the desk directory feel dense. The chips survive because they are
   * the one fact on this page a general news site cannot print.
   */
  terse?: boolean;
}) {
  const chipTickers = hideKickerTicker ? item.tickers.slice(1) : item.tickers;
  const readingTime = terse ? null : formatReadingTime(item.wordCount);

  return (
    <div
      className={`font-news-sans mt-2 flex flex-wrap items-center gap-x-1.5 text-[11px] font-medium uppercase tracking-[0.04em] text-[#1A1210]/70 dark:text-[#F2E9E2]/70 ${className}`}
    >
      {/* The byline proper, when the outlet publishes one. Four of the eight
          feeds do; the rest fall straight through to the masthead, which is
          why this is not a hard-coded "By" prefix on every card. */}
      {item.author && !terse && (
        <>
          <span className="normal-case">By {item.author}</span>
          <span aria-hidden>&middot;</span>
        </>
      )}
      <span>{item.source}</span>
      <span aria-hidden>&middot;</span>
      <span>{formatTimeAgo(item.publishedAt)}</span>
      {readingTime && (
        <>
          <span aria-hidden>&middot;</span>
          <span>{readingTime}</span>
        </>
      )}
      <SentimentBadge sentiment={item.sentiment} />
      {chipTickers.map((ticker) => (
        <TickerChip key={ticker} ticker={ticker} reaction={reactions?.get(ticker)} />
      ))}
    </div>
  );
}

/**
 * "Also covered by BusinessWorld, Philstar Business" — the tail of a cluster
 * (see clusterStories in @pseye/source-news), rendered as one line under the
 * lead story instead of as three more near-identical cards. Renders nothing
 * for the common case of a story only one outlet ran.
 */
function AlsoCoveredBy({ others }: { others: NewsItem[] }) {
  if (others.length === 0) return null;
  // Deduped by outlet: a single masthead sometimes files the same wire story
  // twice under different URLs, and "Also covered by Reuters, Reuters" reads
  // as a bug.
  const seen = new Set<string>();
  const unique = others.filter((item) => !seen.has(item.source) && seen.add(item.source));

  return (
    <p className="font-news-sans mt-1.5 text-[11px] text-[#1A1210]/60 dark:text-[#F2E9E2]/60">
      <span className="uppercase tracking-[0.06em]">Also covered by</span>{" "}
      {unique.map((item, i) => (
        <span key={item.url}>
          {i > 0 && ", "}
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline decoration-[#1A1210]/25 underline-offset-2 hover:decoration-[#990F3D] hover:text-[#990F3D] dark:decoration-[#F2E9E2]/25 dark:hover:text-[#D75980]"
          >
            {item.source}
          </a>
        </span>
      ))}
    </p>
  );
}

/** The story's own lede, as supplied by the outlet's feed and truncated to a
 * sentence boundary at fetch time (see stripHtmlAndTruncate). Every variant
 * shows one now, not just the hero: a page of bare headlines was the single
 * biggest thing separating this from a real section front. */
function Dek({ item, className }: { item: NewsItem; className: string }) {
  if (!item.snippet) return null;
  return <p className={className}>{item.snippet}</p>;
}

function HeroCard({ item, others, reactions }: CardProps) {
  return (
    <article className="group">
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="block">
        <NewsThumbnail item={item} className="aspect-video w-full" />
        <Kicker text={kickerFor(item)} className="mt-4" />
        <h3 className="font-news-serif mt-1.5 text-3xl font-bold leading-[1.08] tracking-tight group-hover:underline sm:text-4xl">
          {item.title}
        </h3>
      </a>
      <Dek
        item={item}
        className="mt-3 font-[Georgia,'Times_New_Roman',serif] text-[17px] leading-relaxed text-[#1A1210]/80 line-clamp-4 dark:text-[#F2E9E2]/80"
      />
      <Byline item={item} reactions={reactions} className="mt-3" />
      <AlsoCoveredBy others={others} />
    </article>
  );
}

/**
 * A desk block's lead: image on top rather than beside, which is what
 * distinguishes it from the headline rows stacked next to it and gives each
 * section one clear entry point.
 *
 * No Kicker, unlike HeroCard/SecondaryCard. The desk name is already the
 * heading two lines above this card, and repeating "ENERGY & POWER" directly
 * under a heading reading "ENERGY & POWER" is the kind of duplication that
 * makes a page feel text-heavy without adding a single fact.
 */
function LeadCard({ item, others, reactions }: CardProps) {
  return (
    <article className="group">
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="block">
        <NewsThumbnail item={item} className="aspect-[16/9] w-full" />
        <h3 className="font-news-serif mt-3 text-[22px] font-bold leading-[1.15] tracking-tight group-hover:underline">
          {item.title}
        </h3>
      </a>
      <Dek
        item={item}
        className="mt-2 font-[Georgia,'Times_New_Roman',serif] text-[15px] leading-normal text-[#1A1210]/75 line-clamp-2 dark:text-[#F2E9E2]/75"
      />
      <Byline item={item} reactions={reactions} />
      <AlsoCoveredBy others={others} />
    </article>
  );
}

/**
 * Headline and nothing else, beyond the source, the time and any ticker chip.
 *
 * The chips stay because they are the one thing on this page a general news
 * site cannot print, and they are three words wide. The lede is what goes:
 * in a stack of four, four ledes is a column of grey the eye slides off,
 * while four headlines is a list a reader can actually scan.
 */
function HeadlineCard({ item, reactions }: CardProps) {
  return (
    <article className="group">
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="block">
        <h3 className="font-news-serif text-[15.5px] font-semibold leading-snug group-hover:underline">
          {item.title}
        </h3>
      </a>
      {/* No AlsoCoveredBy either, unlike every other variant. The credit line
          is a third row of small text under a one-line headline, and in a
          stack of these the stack itself is what a reader is scanning. The
          full credit is still on the story wherever it leads a block. */}
      <Byline item={item} reactions={reactions} className="mt-1.5" terse />
    </article>
  );
}

function SecondaryCard({ item, others, reactions }: CardProps) {
  return (
    <article className="group">
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex gap-4">
        <NewsThumbnail item={item} className="h-20 w-20 sm:h-24 sm:w-24" />
        <div className="min-w-0 flex-1">
          <Kicker text={kickerFor(item)} />
          <h3 className="font-news-serif mt-1 text-lg font-semibold leading-snug group-hover:underline">
            {item.title}
          </h3>
        </div>
      </a>
      <Dek
        item={item}
        className="mt-2 font-[Georgia,'Times_New_Roman',serif] text-[14px] leading-snug text-[#1A1210]/75 line-clamp-2 dark:text-[#F2E9E2]/75"
      />
      <Byline item={item} reactions={reactions} />
      <AlsoCoveredBy others={others} />
    </article>
  );
}

function CompactCard({ item, others, reactions }: CardProps) {
  return (
    <article className="group">
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex gap-3">
        <NewsThumbnail item={item} className="h-16 w-16" />
        <h3 className="font-news-serif min-w-0 flex-1 text-[15px] font-semibold leading-snug group-hover:underline">
          {item.title}
        </h3>
      </a>
      <Dek
        item={item}
        className="mt-2 font-[Georgia,'Times_New_Roman',serif] text-[13.5px] leading-snug text-[#1A1210]/75 line-clamp-3 dark:text-[#F2E9E2]/75"
      />
      <Byline item={item} reactions={reactions} />
      <AlsoCoveredBy others={others} />
    </article>
  );
}

interface CardProps {
  item: NewsItem;
  others: NewsItem[];
  reactions?: MarketReactions;
}

export function NewsCard({
  story,
  variant,
  reactions,
}: {
  story: NewsCluster;
  variant: Variant;
  reactions?: MarketReactions;
}) {
  const props: CardProps = { item: story.lead, others: story.alsoCoveredBy, reactions };
  if (variant === "hero") return <HeroCard {...props} />;
  if (variant === "lead") return <LeadCard {...props} />;
  if (variant === "secondary") return <SecondaryCard {...props} />;
  if (variant === "headline") return <HeadlineCard {...props} />;
  return <CompactCard {...props} />;
}
