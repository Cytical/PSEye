import type { Metadata } from "next";
import { NEWS_SOURCES, type NewsItem } from "@pseye/source-news";

export const revalidate = 3600; // hourly, matches the news ETL cadence

export const metadata: Metadata = {
  title: "News",
  description: "PH business news headlines and snippets, auto-tagged by PSE ticker.",
};

async function fetchAllNews(): Promise<NewsItem[]> {
  const results = await Promise.allSettled(
    NEWS_SOURCES.map((source) => source.fetchLatest())
  );

  const items = results.flatMap((result) =>
    result.status === "fulfilled" ? result.value : []
  );

  return items.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime());
}

export default async function NewsPage() {
  const items = await fetchAllNews();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold">News</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Headlines and short snippets, linked back to the original outlet. Auto-tagged
        by PSE ticker where mentioned.
      </p>

      <ul className="mt-6 flex flex-col gap-4">
        {items.length === 0 && (
          <li className="text-sm text-black/50 dark:text-white/50">
            No items fetched yet — outlet feeds may be unreachable from this
            environment, or none matched. See packages/sources/news/src/outlets.ts.
          </li>
        )}
        {items.map((item) => (
          <li
            key={item.url}
            className="border-b border-black/10 pb-4 dark:border-white/10"
          >
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium hover:underline"
            >
              {item.title}
            </a>
            <div className="mt-1 text-xs text-black/50 dark:text-white/50">
              {item.source} &middot; {item.publishedAt.toLocaleDateString()}
              {item.tickers.length > 0 && (
                <>
                  {" "}
                  &middot;{" "}
                  {item.tickers.map((ticker) => (
                    <span
                      key={ticker}
                      className="ml-1 rounded bg-black/5 px-1.5 py-0.5 font-mono text-[10px] dark:bg-white/10"
                    >
                      {ticker}
                    </span>
                  ))}
                </>
              )}
            </div>
            {item.snippet && (
              <p className="mt-1 text-sm text-black/70 dark:text-white/70">
                {item.snippet}
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
