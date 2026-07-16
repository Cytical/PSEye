import type { NewsItem } from "@pseye/source-news";

function formatRelativeTime(date: Date): string {
  const hours = Math.round((Date.now() - date.getTime()) / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

function TickerPill({ ticker }: { ticker: string }) {
  return (
    <span className="rounded bg-black/5 px-1.5 py-0.5 font-mono text-[10px] dark:bg-white/10">
      {ticker}
    </span>
  );
}

function ByLine({ item }: { item: NewsItem }) {
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-black/50 dark:text-white/50">
      <span>{item.source}</span>
      <span>&middot;</span>
      <span>{formatRelativeTime(item.publishedAt)}</span>
      {item.tickers.map((ticker) => (
        <TickerPill key={ticker} ticker={ticker} />
      ))}
    </div>
  );
}

/** Image-forward treatment for the handful of headlines picked to feature. */
export function FeaturedCard({ item }: { item: NewsItem }) {
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noopener noreferrer"
      className="group overflow-hidden rounded-md border border-black/10 dark:border-white/10"
    >
      <div className="aspect-[16/9] overflow-hidden bg-black/5 dark:bg-white/5">
        {/* eslint-disable-next-line @next/next/no-img-element -- thumbnails come from
            arbitrary outlet domains (see outlets.ts), so next/image's remote-pattern
            allowlist isn't a fit here. */}
        <img
          src={item.imageUrl ?? undefined}
          alt={item.title}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
        />
      </div>
      <div className="p-3">
        <p className="font-medium leading-snug group-hover:underline">{item.title}</p>
        <ByLine item={item} />
      </div>
    </a>
  );
}

function HeadlineRow({ item }: { item: NewsItem }) {
  return (
    <li className="border-b border-black/10 pb-4 dark:border-white/10">
      <a
        href={item.url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-medium hover:underline"
      >
        {item.title}
      </a>
      <ByLine item={item} />
      {item.snippet && (
        <p className="mt-1 text-sm text-black/70 dark:text-white/70">{item.snippet}</p>
      )}
    </li>
  );
}

export function NewsList({ items }: { items: NewsItem[] }) {
  return (
    <>
      {items.map((item) => (
        <HeadlineRow key={item.url} item={item} />
      ))}
    </>
  );
}
