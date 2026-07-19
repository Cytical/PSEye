"use client";

import { useWatchlist } from "@/lib/watchlist";

interface WatchlistStarButtonProps {
  ticker: string;
  size?: number;
  className?: string;
}

/** Star toggle for the anonymous localStorage watchlist — used on the market
 * map's company detail panel and the /stocks/[ticker] header. */
export function WatchlistStarButton({ ticker, size = 20, className = "" }: WatchlistStarButtonProps) {
  const { isWatched, toggle } = useWatchlist();
  const watched = isWatched(ticker);

  return (
    <button
      type="button"
      onClick={() => toggle(ticker)}
      aria-pressed={watched}
      aria-label={watched ? `Remove ${ticker} from watchlist` : `Add ${ticker} to watchlist`}
      title={watched ? "Remove from watchlist" : "Add to watchlist"}
      className={`shrink-0 rounded-md p-1 transition-colors hover:bg-panel-raised ${className}`}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={watched ? "#f5b400" : "none"}
        stroke={watched ? "#f5b400" : "currentColor"}
        strokeWidth="1.5"
        strokeLinejoin="round"
        className={watched ? "" : "text-panel-fg/60"}
      >
        <path d="M12 2.5l3.09 6.26 6.91 1.01-5 4.87 1.18 6.86L12 18.27l-6.18 3.23L7 14.64l-5-4.87 6.91-1.01L12 2.5z" />
      </svg>
    </button>
  );
}
