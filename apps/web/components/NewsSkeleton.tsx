/** Placeholder blocks sized to match the real front page/more-headlines
 * layout, so streaming the real content in doesn't shift the page. */
export function NewsFrontSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
      <div className="animate-pulse lg:col-span-2">
        <div className="aspect-video w-full bg-[#1A1210]/10 dark:bg-[#F2E9E2]/10" />
        <div className="mt-4 h-3 w-24 bg-[#1A1210]/10 dark:bg-[#F2E9E2]/10" />
        <div className="mt-2 h-9 w-5/6 bg-[#1A1210]/10 dark:bg-[#F2E9E2]/10" />
        <div className="mt-3 h-4 w-full bg-[#1A1210]/10 dark:bg-[#F2E9E2]/10" />
        <div className="mt-3 h-3 w-1/3 bg-[#1A1210]/10 dark:bg-[#F2E9E2]/10" />
      </div>
      <div className="flex flex-col lg:col-span-1 lg:border-l lg:border-[#1A1210]/15 lg:pl-8 lg:dark:border-[#F2E9E2]/15">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex animate-pulse gap-4 border-t border-[#1A1210]/10 py-6 first:border-t-0 first:pt-0 dark:border-[#F2E9E2]/10"
          >
            <div className="h-20 w-20 shrink-0 bg-[#1A1210]/10 dark:bg-[#F2E9E2]/10 sm:h-24 sm:w-24" />
            <div className="min-w-0 flex-1">
              <div className="h-3 w-16 bg-[#1A1210]/10 dark:bg-[#F2E9E2]/10" />
              <div className="mt-2 h-4 w-full bg-[#1A1210]/10 dark:bg-[#F2E9E2]/10" />
              <div className="mt-1.5 h-4 w-2/3 bg-[#1A1210]/10 dark:bg-[#F2E9E2]/10" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function NewsMoreSkeleton() {
  return (
    <ul className="mt-5 grid grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 24 }).map((_, i) => (
        <li key={i} className="animate-pulse border-b border-[#1A1210]/10 pb-5 dark:border-[#F2E9E2]/10">
          <div className="flex gap-3">
            <div className="h-16 w-16 shrink-0 bg-[#1A1210]/10 dark:bg-[#F2E9E2]/10" />
            <div className="min-w-0 flex-1">
              <div className="h-4 w-full bg-[#1A1210]/10 dark:bg-[#F2E9E2]/10" />
              <div className="mt-2 h-4 w-2/3 bg-[#1A1210]/10 dark:bg-[#F2E9E2]/10" />
            </div>
          </div>
          <div className="mt-2 h-3 w-1/3 bg-[#1A1210]/10 dark:bg-[#F2E9E2]/10" />
        </li>
      ))}
    </ul>
  );
}

export function NewsMoodSkeleton() {
  return (
    <div className="animate-pulse border-y border-[#1A1210]/10 py-3 dark:border-[#F2E9E2]/10">
      <div className="h-3 w-24 bg-[#1A1210]/10 dark:bg-[#F2E9E2]/10" />
      <div className="mt-2 h-4 w-2/3 bg-[#1A1210]/10 dark:bg-[#F2E9E2]/10" />
    </div>
  );
}
