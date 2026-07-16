import { Suspense } from "react";
import type { Metadata } from "next";
import type { NewsItem } from "@pseye/source-news";
import { fetchNewsProgressive, isToday, byImportance } from "@/lib/news";
import { NewsList, FeaturedCard } from "@/components/NewsList";
import { NewsListSkeleton } from "@/components/NewsListSkeleton";

export const revalidate = 3600; // hourly, matches the news ETL cadence

export const metadata: Metadata = {
  title: "News",
  description: "PH business news headlines and snippets, auto-tagged by PSE ticker.",
};

const FEATURED_LIMIT = 4;
const REST_TODAY_LIMIT = 20;
const OLDER_LIMIT = 10;

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

  // Only a handful of headlines get the image treatment, so the page stays
  // scannable instead of turning into an image wall.
  const featured = items
    .filter((item) => isToday(item.publishedAt) && item.imageUrl)
    .slice(0, FEATURED_LIMIT);
  const featuredUrls = new Set(featured.map((item) => item.url));
  const rows = items.filter((item) => !featuredUrls.has(item.url));

  return (
    <>
      {featured.length > 0 && (
        <li>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {featured.map((item) => (
              <FeaturedCard key={item.url} item={item} />
            ))}
          </div>
        </li>
      )}
      <NewsList items={rows} />
    </>
  );
}

async function RestNews({ itemsPromise }: { itemsPromise: Promise<NewsItem[]> }) {
  const items = await itemsPromise;

  const moreToday = items.filter((item) => isToday(item.publishedAt));
  const olderDays = items.filter((item) => !isToday(item.publishedAt));

  const todayRows = [...moreToday].sort(byImportance).slice(0, REST_TODAY_LIMIT);
  const todayHiddenCount = moreToday.length - todayRows.length;

  // "Important" = mentions a tracked ticker, so the capped older section
  // stays relevant to a stock tracker rather than just "whatever's newest".
  const olderRows = [...olderDays].sort(byImportance).slice(0, OLDER_LIMIT);

  return (
    <>
      <NewsList items={todayRows} />

      {todayHiddenCount > 0 && (
        <li className="text-xs text-black/40 dark:text-white/40">
          {todayHiddenCount} more headline{todayHiddenCount === 1 ? "" : "s"} from today not
          shown.
        </li>
      )}

      {olderRows.length > 0 && (
        <>
          <li>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-black/40 dark:text-white/40">
              Previously &middot; top stories
            </h2>
            <p className="mt-1 text-xs text-black/40 dark:text-white/40">
              The {OLDER_LIMIT} most relevant stories from earlier days, prioritizing ones
              that mention a tracked ticker.
            </p>
          </li>
          <NewsList items={olderRows} />
        </>
      )}
    </>
  );
}
