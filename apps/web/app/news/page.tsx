import { Suspense } from "react";
import type { Metadata } from "next";
import type { NewsItem } from "@pseye/source-news";
import { fetchNewsProgressive } from "@/lib/news";
import { NewsCard } from "@/components/NewsCard";
import { NewsFrontSkeleton, NewsMoreSkeleton } from "@/components/NewsSkeleton";
import { newsSerif, newsSans } from "./fonts";

export const revalidate = 3600; // hourly, matches the news ETL cadence

export const metadata: Metadata = {
  title: "News",
  description: "The most relevant PH business headlines, auto-tagged by PSE ticker.",
};

export default function NewsPage() {
  // Kicked off here (not awaited) so both tiers fetch in parallel; each
  // Suspense boundary below awaits only the slice it needs.
  const { top, rest } = fetchNewsProgressive();

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div
      className={`${newsSerif.variable} ${newsSans.variable} mx-auto max-w-7xl px-4 py-8 sm:px-6`}
    >
      <header className="border-b-4 border-black pb-3 dark:border-white">
        <p className="font-news-sans text-xs font-semibold uppercase tracking-[0.14em] text-black/50 dark:text-white/50">
          {today}
        </p>
        <h1 className="font-news-serif mt-1 text-4xl font-bold tracking-tight sm:text-5xl">
          Markets News
        </h1>
        <p className="font-news-sans mt-2 text-sm text-black/60 dark:text-white/60">
          The most relevant headlines, ranked by relevance to PSE-listed companies and linked
          back to the original outlet.
        </p>
        <a
          href="/feed.xml"
          className="font-news-sans mt-2 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-[#b8862f] hover:underline"
        >
          RSS feed
        </a>
      </header>

      <div className="mt-8">
        <Suspense fallback={<NewsFrontSkeleton />}>
          <FrontPage itemsPromise={top} />
        </Suspense>
      </div>

      <div className="mt-14">
        <h2 className="font-news-sans border-b-2 border-black pb-2 text-sm font-bold uppercase tracking-[0.12em] dark:border-white">
          More Headlines
        </h2>
        <Suspense fallback={<NewsMoreSkeleton />}>
          <MoreHeadlines itemsPromise={rest} />
        </Suspense>
      </div>
    </div>
  );
}

async function FrontPage({ itemsPromise }: { itemsPromise: Promise<NewsItem[]> }) {
  const items = await itemsPromise;

  if (items.length === 0) {
    return (
      <p className="font-news-sans text-sm text-black/50 dark:text-white/50">
        No items fetched yet — outlet feeds may be unreachable from this environment, or none
        matched. See packages/sources/news/src/outlets.ts.
      </p>
    );
  }

  const [hero, ...secondary] = items;

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <NewsCard item={hero} variant="hero" />
      </div>
      {secondary.length > 0 && (
        <div className="flex flex-col lg:col-span-1 lg:border-l lg:border-black/15 lg:pl-8 lg:dark:border-white/15">
          {secondary.map((item) => (
            <div
              key={item.url}
              className="border-t border-black/10 py-6 first:border-t-0 first:pt-0 dark:border-white/10"
            >
              <NewsCard item={item} variant="secondary" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

async function MoreHeadlines({ itemsPromise }: { itemsPromise: Promise<NewsItem[]> }) {
  const items = await itemsPromise;

  if (items.length === 0) return null;

  return (
    <ul className="mt-5 grid grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <li key={item.url} className="border-b border-black/10 pb-5 dark:border-white/10">
          <NewsCard item={item} variant="compact" />
        </li>
      ))}
    </ul>
  );
}
