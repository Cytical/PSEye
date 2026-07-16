import type { NewsItem } from "@pseye/source-news";

type Variant = "hero" | "secondary" | "compact";

const TITLE_STYLES: Record<Variant, string> = {
  hero: "text-2xl font-bold leading-tight tracking-tight sm:text-3xl",
  secondary: "text-base font-semibold leading-snug",
  compact: "text-sm font-semibold leading-snug",
};

const SNIPPET_STYLES: Record<Variant, string> = {
  hero: "mt-3 text-base text-black/70 dark:text-white/70 line-clamp-3",
  secondary: "mt-1.5 text-sm text-black/60 dark:text-white/60 line-clamp-2",
  compact: "mt-1 text-sm text-black/60 dark:text-white/60 line-clamp-2",
};

const IMAGE_ASPECT: Record<Variant, string> = {
  hero: "aspect-video",
  secondary: "aspect-[16/10]",
  compact: "",
};

/** "3h ago" style timestamp, matching the NYT/FT convention this redesign follows. */
function formatTimeAgo(date: Date): string {
  const diffMinutes = Math.round((Date.now() - date.getTime()) / 60_000);
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.round(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.round(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function NewsCard({ item, variant }: { item: NewsItem; variant: Variant }) {
  const showImage = item.imageUrl && variant !== "compact";
  const showSnippet = item.snippet && variant !== "compact";

  return (
    <article>
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="group block">
        {showImage && (
          <div
            className={`${IMAGE_ASPECT[variant]} w-full overflow-hidden rounded-lg bg-black/5 dark:bg-white/10`}
          >
            {/* External, outlet-controlled hosts — next/image would need an
                unbounded remotePatterns allowlist for one <img>'s worth of value. */}
            <img
              src={item.imageUrl!}
              alt=""
              loading="lazy"
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
            />
          </div>
        )}
        <h3 className={`${TITLE_STYLES[variant]} ${showImage ? "mt-3" : ""} group-hover:underline`}>
          {item.title}
        </h3>
      </a>
      {showSnippet && <p className={SNIPPET_STYLES[variant]}>{item.snippet}</p>}
      <div className="mt-2 text-xs text-black/50 dark:text-white/50">
        {item.source} &middot; {formatTimeAgo(item.publishedAt)}
        {item.tickers.length > 0 &&
          item.tickers.map((ticker) => (
            <span
              key={ticker}
              className="ml-1 rounded bg-black/5 px-1.5 py-0.5 font-mono text-[10px] dark:bg-white/10"
            >
              {ticker}
            </span>
          ))}
      </div>
    </article>
  );
}
