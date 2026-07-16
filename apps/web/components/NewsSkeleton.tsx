/** Placeholder blocks sized to match the real front page/more-headlines
 * layout, so streaming the real content in doesn't shift the page. */
export function NewsFrontSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
      <div className="animate-pulse lg:col-span-2">
        <div className="aspect-video w-full rounded-lg bg-black/10 dark:bg-white/10" />
        <div className="mt-3 h-7 w-5/6 rounded bg-black/10 dark:bg-white/10" />
        <div className="mt-2 h-4 w-full rounded bg-black/10 dark:bg-white/10" />
        <div className="mt-4 h-3 w-1/3 rounded bg-black/10 dark:bg-white/10" />
      </div>
      <div className="flex flex-col gap-6 lg:col-span-1 lg:border-l lg:border-black/10 lg:pl-6 lg:dark:border-white/10">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-4 w-full rounded bg-black/10 dark:bg-white/10" />
            <div className="mt-2 h-4 w-2/3 rounded bg-black/10 dark:bg-white/10" />
            <div className="mt-3 h-3 w-1/4 rounded bg-black/10 dark:bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function NewsMoreSkeleton() {
  return (
    <ul className="mt-4 grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <li
          key={i}
          className="animate-pulse border-b border-black/10 pb-4 dark:border-white/10"
        >
          <div className="h-4 w-3/4 rounded bg-black/10 dark:bg-white/10" />
          <div className="mt-2 h-3 w-full rounded bg-black/10 dark:bg-white/10" />
          <div className="mt-1 h-3 w-1/3 rounded bg-black/10 dark:bg-white/10" />
        </li>
      ))}
    </ul>
  );
}
