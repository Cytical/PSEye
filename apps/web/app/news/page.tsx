import { Suspense } from "react";
import type { Metadata } from "next";
import type { NewsItem } from "@pseye/source-news";
import { fetchNewsProgressive } from "@/lib/news";
import { NewsCard } from "@/components/NewsCard";
import { NewsFrontSkeleton, NewsMoreSkeleton } from "@/components/NewsSkeleton";

export const revalidate = 3600; // hourly, matches the news ETL cadence

export const metadata: Metadata = {
  title: "News",
  description: "The most relevant PH business headlines, auto-tagged by PSE ticker.",
};

export default function NewsPage() {
  // Kicked off here (not awaited) so both tiers fetch in parallel; each
  // Suspense boundary below awaits only the slice it needs.
  const { top, rest } = fetchNewsProgressive();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8">
      <h1 className="text-2xl font-bold tracking-tight">News</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        The most relevant headlines, ranked by relevance to PSE-listed companies and linked
        back to the original outlet.
      </p>

      <div className="mt-8">
        <Suspense fallback={<NewsFrontSkeleton />}>
          <FrontPage itemsPromise={top} />
        </Suspense>
      </div>

      <div className="mt-12 border-t border-black/10 pt-8 dark:border-white/10">
        <h2 className="text-lg font-semibold">More Headlines</h2>
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
      <p className="text-sm text-black/50 dark:text-white/50">
        No items fetched yet — outlet feeds may be unreachable from this environment, or none
        matched. See packages/sources/news/src/outlets.ts.
      </p>
    );
  }

  const [hero, ...secondary] = items;

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="lg:col-span-2">
        <NewsCard item={hero} variant="hero" />
      </div>
      {secondary.length > 0 && (
        <div className="flex flex-col gap-6 lg:col-span-1 lg:border-l lg:border-black/10 lg:pl-6 lg:dark:border-white/10">
          {secondary.map((item) => (
            <NewsCard key={item.url} item={item} variant="secondary" />
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
    <ul className="mt-4 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
      {items.map((item) => (
        <li key={item.url} className="border-b border-black/10 pb-4 dark:border-white/10">
          <NewsCard item={item} variant="compact" />
        </li>
      ))}
    </ul>
  );
}
