import type { NewsItem } from "@pseye/source-news";

export function NewsList({ items }: { items: NewsItem[] }) {
  return (
    <>
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
    </>
  );
}
