"use client";

import Link from "next/link";
import { useRecentlyViewed } from "@/lib/recentlyViewed";

/** Renders nothing until there's at least one other ticker to show — keeps
 * the page's static shell (loading.tsx) accurate rather than reserving space
 * for a section that's usually empty on a visitor's first-ever page view. */
export function RecentlyViewed({ excludeTicker }: { excludeTicker?: string }) {
  const tickers = useRecentlyViewed(excludeTicker);
  if (tickers.length === 0) return null;

  return (
    <div className="mt-8">
      <h2 className="text-sm font-medium">Recently viewed</h2>
      <div className="mt-2 flex flex-wrap gap-2">
        {tickers.map((ticker) => (
          <Link
            key={ticker}
            href={`/stocks/${ticker}`}
            className="rounded-full border border-black/15 px-2.5 py-1 font-mono text-xs hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
          >
            {ticker}
          </Link>
        ))}
      </div>
    </div>
  );
}
