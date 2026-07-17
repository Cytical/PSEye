import Link from "next/link";
import { PSE_EDGE_COMPANIES } from "@pseye/source-quotes";
import type { NewsItem } from "@pseye/source-news";

const TRACKED_TICKERS = new Set(PSE_EDGE_COMPANIES.map((c) => c.ticker));

type Variant = "hero" | "secondary" | "compact";

/** "3h ago" style timestamp, matching the NYT/FT convention this redesign follows. */
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

function Kicker({ text, className = "" }: { text: string; className?: string }) {
  return (
    <p
      className={`font-news-sans text-[11px] font-bold uppercase tracking-[0.1em] text-black/70 dark:text-white/70 ${className}`}
    >
      {text}
    </p>
  );
}

function Byline({ item, className = "" }: { item: NewsItem; className?: string }) {
  return (
    <div
      className={`font-news-sans mt-2 flex flex-wrap items-center gap-x-1.5 text-[11px] font-medium uppercase tracking-[0.04em] text-black/50 dark:text-white/50 ${className}`}
    >
      <span>{item.source}</span>
      <span aria-hidden>&middot;</span>
      <span>{formatTimeAgo(item.publishedAt)}</span>
      {item.tickers.map((ticker) =>
        TRACKED_TICKERS.has(ticker) ? (
          <Link
            key={ticker}
            href={`/stocks/${ticker}`}
            className="border border-black/20 px-1 py-px font-mono text-[10px] tracking-normal text-black/60 hover:border-black/40 hover:text-black/90 dark:border-white/25 dark:text-white/60 dark:hover:border-white/50 dark:hover:text-white/90"
          >
            {ticker}
          </Link>
        ) : (
          <span
            key={ticker}
            className="border border-black/20 px-1 py-px font-mono text-[10px] tracking-normal text-black/60 dark:border-white/25 dark:text-white/60"
          >
            {ticker}
          </span>
        )
      )}
    </div>
  );
}

function Thumbnail({ item, className }: { item: NewsItem; className: string }) {
  if (!item.imageUrl) return null;
  return (
    <div className={`shrink-0 overflow-hidden bg-black/5 dark:bg-white/10 ${className}`}>
      {/* External, outlet-controlled hosts — next/image would need an
          unbounded remotePatterns allowlist for one <img>'s worth of value. */}
      <img
        src={item.imageUrl}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
      />
    </div>
  );
}

function HeroCard({ item }: { item: NewsItem }) {
  return (
    <article>
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="group block">
        <Thumbnail item={item} className="aspect-video w-full" />
        <Kicker text={kickerFor(item)} className="mt-4" />
        <h3 className="font-news-serif mt-1.5 text-3xl font-bold leading-[1.08] tracking-tight group-hover:underline sm:text-4xl">
          {item.title}
        </h3>
      </a>
      {item.snippet && (
        <p className="mt-3 font-[Georgia,'Times_New_Roman',serif] text-[17px] leading-relaxed text-black/80 line-clamp-3 dark:text-white/80">
          {item.snippet}
        </p>
      )}
      <Byline item={item} className="mt-3" />
    </article>
  );
}

function SecondaryCard({ item }: { item: NewsItem }) {
  return (
    <article>
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="group flex gap-4">
        <Thumbnail item={item} className="h-20 w-20 sm:h-24 sm:w-24" />
        <div className="min-w-0 flex-1">
          <Kicker text={kickerFor(item)} />
          <h3 className="font-news-serif mt-1 text-lg font-semibold leading-snug group-hover:underline">
            {item.title}
          </h3>
        </div>
      </a>
      <Byline item={item} />
    </article>
  );
}

function CompactCard({ item }: { item: NewsItem }) {
  return (
    <article>
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="group block">
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
