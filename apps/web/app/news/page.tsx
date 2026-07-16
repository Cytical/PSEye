import { Suspense } from "react";
import type { Metadata } from "next";
import type { NewsItem } from "@pseye/source-news";
import { fetchNewsProgressive } from "@/lib/news";
import { NewsList } from "@/components/NewsList";
import { NewsListSkeleton } from "@/components/NewsListSkeleton";

export const revalidate = 3600; // hourly, matches the news ETL cadence

export const metadata: Metadata = {
  title: "News",
  description: "PH business news headlines and snippets, auto-tagged by PSE ticker.",
};

export default function NewsPage() {
  // Kicked off here (not awaited) so both tiers fetch in parallel; each
  // Suspense boundary below awaits only the slice it needs.
  const { top, rest } = fetchNewsProgressive();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold">News</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Headlines and short snippets, linked back to the original outlet. Auto-tagged
        by PSE ticker where mentioned.
      </p>

      <ul className="mt-6 flex flex-col gap-4">
        <Suspense fallback={<NewsListSkeleton count={8} />}>
          <TopNews itemsPromise={top} />
        </Suspense>
        <Suspense fallback={<NewsListSkeleton count={3} />}>
          <RestNews itemsPromise={rest} />
        </Suspense>
      </ul>
    </div>
  );
}

async function TopNews({ itemsPromise }: { itemsPromise: Promise<NewsItem[]> }) {
  const items = await itemsPromise;

  if (items.length === 0) {
    return (
      <li className="text-sm text-black/50 dark:text-white/50">
        No items fetched yet — outlet feeds may be unreachable from this
        environment, or none matched. See packages/sources/news/src/outlets.ts.
      </li>
    );
  }

  return <NewsList items={items} />;
}

async function RestNews({ itemsPromise }: { itemsPromise: Promise<NewsItem[]> }) {
  const items = await itemsPromise;
  return <NewsList items={items} />;
}
