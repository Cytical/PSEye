import type { Metadata } from "next";
import { NEWS_SOURCES, type NewsItem } from "@pseye/source-news";

export const revalidate = 3600; // hourly, matches the news ETL cadence

export const metadata: Metadata = {
  title: "News",
  description: "PH business news headlines and snippets, auto-tagged by PSE ticker.",
};

const FEATURED_LIMIT = 4;
const TODAY_LIMIT = 20;
const OLDER_LIMIT = 10;

// Ticker-tagged items (i.e. about a stock this site actually tracks) sort
// ahead of generic headlines; ties break by recency.
function byImportance(a: NewsItem, b: NewsItem): number {
  const aScore = a.tickers.length > 0 ? 1 : 0;
  const bScore = b.tickers.length > 0 ? 1 : 0;
  if (aScore !== bScore) return bScore - aScore;
  return b.publishedAt.getTime() - a.publishedAt.getTime();
}

async function fetchAllNews(): Promise<NewsItem[]> {
  const results = await Promise.allSettled(
    NEWS_SOURCES.map((source) => source.fetchLatest())
  );

  const items = results.flatMap((result) =>
    result.status === "fulfilled" ? result.value : []
  );

  return items.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function formatDayHeading(date: Date): string {
  const now = new Date();
  if (isSameDay(date, now)) return "Today";
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (isSameDay(date, yesterday)) return "Yesterday";
  return date.toLocaleDateString("en-PH", { weekday: "long", month: "short", day: "numeric" });
}

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

function FeaturedCard({ item }: { item: NewsItem }) {
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
    <li className="py-3 first:pt-0">
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

export default async function NewsPage() {
  const items = await fetchAllNews();

  const latestDate = items[0]?.publishedAt ?? null;
  const latestItems = latestDate
    ? items.filter((item) => isSameDay(item.publishedAt, latestDate))
    : [];
  const olderItems = latestDate
    ? items.filter((item) => !isSameDay(item.publishedAt, latestDate))
    : [];

  // "Important" = mentions a tracked ticker, so the capped older section stays
  // relevant to a stock tracker rather than just "whatever's most recent".
  const importantOlder = [...olderItems].sort(byImportance).slice(0, OLDER_LIMIT);

  // Only a handful of headlines get the image treatment, so the page stays
  // scannable instead of turning into an image wall.
  const featured = latestItems.filter((item) => item.imageUrl).slice(0, FEATURED_LIMIT);
  const featuredUrls = new Set(featured.map((item) => item.url));
  const latestRestAll = latestItems.filter((item) => !featuredUrls.has(item.url));
  const latestRest = [...latestRestAll].sort(byImportance).slice(0, TODAY_LIMIT);
  const latestHiddenCount = latestRestAll.length - latestRest.length;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold">News</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Headlines and short snippets, linked back to the original outlet. Auto-tagged
        by PSE ticker where mentioned.
      </p>

      {items.length === 0 && (
        <p className="mt-6 text-sm text-black/50 dark:text-white/50">
          No items fetched yet — outlet feeds may be unreachable from this environment,
          or none matched. See packages/sources/news/src/outlets.ts.
        </p>
      )}

      {latestItems.length > 0 && (
        <div className="mt-6">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-black/40 dark:text-white/40">
            {formatDayHeading(latestDate as Date)}
          </h2>

          {featured.length > 0 && (
            <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
              {featured.map((item) => (
                <FeaturedCard key={item.url} item={item} />
              ))}
            </div>
          )}

          {latestRest.length > 0 && (
            <ul className="mt-3 flex flex-col divide-y divide-black/10 dark:divide-white/10">
              {latestRest.map((item) => (
                <HeadlineRow key={item.url} item={item} />
              ))}
            </ul>
          )}

          {latestHiddenCount > 0 && (
            <p className="mt-3 text-xs text-black/40 dark:text-white/40">
              {latestHiddenCount} more headline{latestHiddenCount === 1 ? "" : "s"} not shown.
            </p>
          )}
        </div>
      )}

      {importantOlder.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-black/40 dark:text-white/40">
            Previously &middot; top stories
          </h2>
          <p className="mt-1 text-xs text-black/40 dark:text-white/40">
            The {OLDER_LIMIT} most relevant stories from earlier days, prioritizing ones
            that mention a tracked ticker.
          </p>
          <ul className="mt-3 flex flex-col divide-y divide-black/10 dark:divide-white/10">
            {importantOlder.map((item) => (
              <HeadlineRow key={item.url} item={item} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
