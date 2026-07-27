import Link from "next/link";
import { PSE_EDGE_COMPANIES } from "@pseye/source-quotes";
import type { NewsItem } from "@pseye/source-news";
import { NewsThumbnail } from "./NewsThumbnail";

const TRACKED_TICKERS = new Set(PSE_EDGE_COMPANIES.map((c) => c.ticker));

type Variant = "hero" | "secondary" | "compact";

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

/** First tagged ticker stands in for a section eyebrow; untagged stories get
 * a generic one, since every outlet here is a business desk. */
function kickerFor(item: NewsItem): string {
  return item.tickers[0] ?? "BUSINESS";
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

function Byline({
  item,
  className = "",
  hideKickerTicker = false,
}: {
  item: NewsItem;
  className?: string;
  /**
   * HeroCard/SecondaryCard render a Kicker above this byline using
   * kickerFor(item), i.e. item.tickers[0] — pass true from those variants so
   * the chip list doesn't repeat that same company right below it.
   * CompactCard has no Kicker, so it keeps the full tickers list.
   */
  hideKickerTicker?: boolean;
}) {
  const chipTickers = hideKickerTicker ? item.tickers.slice(1) : item.tickers;

  return (
    <div
      className={`font-news-sans mt-2 flex flex-wrap items-center gap-x-1.5 text-[11px] font-medium uppercase tracking-[0.04em] text-[#1A1210]/70 dark:text-[#F2E9E2]/70 ${className}`}
    >
      <span>{item.source}</span>
      <span aria-hidden>&middot;</span>
      <span>{formatTimeAgo(item.publishedAt)}</span>
      <SentimentBadge sentiment={item.sentiment} />
      {chipTickers.map((ticker) =>
        TRACKED_TICKERS.has(ticker) ? (
          <Link
            key={ticker}
            href={`/stocks/${ticker}`}
            className="border border-[#990F3D]/40 px-1 py-px font-mono text-[10px] tracking-normal text-[#990F3D] hover:border-[#990F3D] hover:bg-[#990F3D]/10 dark:border-[#D75980]/45 dark:text-[#D75980] dark:hover:border-[#D75980] dark:hover:bg-[#D75980]/15"
          >
            {ticker}
          </Link>
        ) : (
          <span
            key={ticker}
            className="border border-[#990F3D]/25 px-1 py-px font-mono text-[10px] tracking-normal text-[#990F3D]/70 dark:border-[#D75980]/30 dark:text-[#D75980]/70"
          >
            {ticker}
          </span>
        )
      )}
    </div>
  );
}

function HeroCard({ item }: { item: NewsItem }) {
  return (
    <article className="group">
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="block">
        <NewsThumbnail item={item} className="aspect-video w-full" />
        <Kicker text={kickerFor(item)} className="mt-4" />
        <h3 className="font-news-serif mt-1.5 text-3xl font-bold leading-[1.08] tracking-tight group-hover:underline sm:text-4xl">
          {item.title}
        </h3>
      </a>
      {item.snippet && (
        <p className="mt-3 font-[Georgia,'Times_New_Roman',serif] text-[17px] leading-relaxed text-[#1A1210]/80 line-clamp-3 dark:text-[#F2E9E2]/80">
          {item.snippet}
        </p>
      )}
      <Byline item={item} className="mt-3" hideKickerTicker />
    </article>
  );
}

function SecondaryCard({ item }: { item: NewsItem }) {
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
      <Byline item={item} hideKickerTicker />
    </article>
  );
}

function CompactCard({ item }: { item: NewsItem }) {
  return (
    <article className="group">
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="block">
        <h3 className="font-news-serif text-[15px] font-semibold leading-snug group-hover:underline">
          {item.title}
        </h3>
      </a>
      <Byline item={item} />
    </article>
  );
}

export function NewsCard({ item, variant }: { item: NewsItem; variant: Variant }) {
  if (variant === "hero") return <HeroCard item={item} />;
  if (variant === "secondary") return <SecondaryCard item={item} />;
  return <CompactCard item={item} />;
}
