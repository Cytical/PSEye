/** Placeholder rows sized to match a real NewsList item, so streaming the
 * real content in doesn't shift the layout. */
export function NewsListSkeleton({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <li
          key={i}
          className="animate-pulse border-b border-black/10 pb-4 dark:border-white/10"
        >
          <div className="h-4 w-3/4 rounded bg-black/10 dark:bg-white/10" />
          <div className="mt-2 h-3 w-1/3 rounded bg-black/10 dark:bg-white/10" />
          <div className="mt-2 h-3 w-full rounded bg-black/10 dark:bg-white/10" />
          <div className="mt-1 h-3 w-5/6 rounded bg-black/10 dark:bg-white/10" />
        </li>
      ))}
    </>
  );
}
