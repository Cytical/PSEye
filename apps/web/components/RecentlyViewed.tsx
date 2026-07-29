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
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="kicker text-panel-fg/60">Recently viewed</span>
      {tickers.map((ticker) => (
        <Link
          key={ticker}
          href={`/stocks/${ticker}`}
          className="rounded-full border border-panel-border px-2.5 py-0.5 font-mono text-xs text-panel-fg transition-colors hover:bg-panel-raised"
        >
          {ticker}
        </Link>
      ))}
    </div>
  );
}
