/** Placeholder blocks sized to match the real front page/more-headlines
 * layout, so streaming the real content in doesn't shift the page. */
export function NewsFrontSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
      <div className="animate-pulse lg:col-span-2">
        <div className="aspect-video w-full bg-[#1A1210]/10 dark:bg-[#F2E9E2]/10" />
        <div className="mt-4 h-3 w-24 bg-[#1A1210]/10 dark:bg-[#F2E9E2]/10" />
        <div className="mt-2 h-9 w-5/6 bg-[#1A1210]/10 dark:bg-[#F2E9E2]/10" />
        {/* Four dek lines, matching HeroCard's line-clamp-4. */}
        <div className="mt-3 h-4 w-full bg-[#1A1210]/10 dark:bg-[#F2E9E2]/10" />
        <div className="mt-1.5 h-4 w-full bg-[#1A1210]/10 dark:bg-[#F2E9E2]/10" />
        <div className="mt-1.5 h-4 w-4/5 bg-[#1A1210]/10 dark:bg-[#F2E9E2]/10" />
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

/** Stands in for the four-across "Latest" strip: image-top cards with two
 * lede lines each, matching LeadCard. */
export function NewsLatestSkeleton() {
  return (
    <div className="mt-12 animate-pulse border-t-2 border-[#1A1210]/85 pt-3 dark:border-[#F2E9E2]/70">
      <div className="h-4 w-24 bg-[#1A1210]/10 dark:bg-[#F2E9E2]/10" />
      <ul className="mt-5 grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <li key={i}>
            <div className="aspect-[16/9] w-full bg-[#1A1210]/10 dark:bg-[#F2E9E2]/10" />
            <div className="mt-3 h-5 w-full bg-[#1A1210]/10 dark:bg-[#F2E9E2]/10" />
            <div className="mt-1.5 h-5 w-3/4 bg-[#1A1210]/10 dark:bg-[#F2E9E2]/10" />
            <div className="mt-2 h-3.5 w-full bg-[#1A1210]/10 dark:bg-[#F2E9E2]/10" />
            <div className="mt-1.5 h-3.5 w-5/6 bg-[#1A1210]/10 dark:bg-[#F2E9E2]/10" />
            <div className="mt-2 h-3 w-1/2 bg-[#1A1210]/10 dark:bg-[#F2E9E2]/10" />
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Stands in for the "Browse by desk" directory. The desk headings are part of
 * this rather than sitting outside the Suspense boundary: they are data
 * (which desks exist today depends on what was filed), so rendering fixed
 * headings above a loading grid would mean promising a desk that may not
 * appear.
 *
 * Six placeholder cards for what is usually eleven: the grid is three across,
 * so six fills the two rows a reader can actually see before the fold, and
 * eleven pulsing blocks reads as a page still loading long after it has.
 */
export function NewsMoreSkeleton() {
  return (
    <div className="mt-12 animate-pulse">
      <div className="flex items-baseline justify-between border-t-2 border-[#1A1210]/85 pt-3 dark:border-[#F2E9E2]/70">
        <div className="h-4 w-36 bg-[#1A1210]/10 dark:bg-[#F2E9E2]/10" />
        <div className="h-3 w-14 bg-[#1A1210]/10 dark:bg-[#F2E9E2]/10" />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, card) => (
          <div key={card}>
            <div className="flex items-baseline justify-between border-b border-[#990F3D] pb-1.5 dark:border-[#D75980]">
              <div className="h-3 w-28 bg-[#1A1210]/10 dark:bg-[#F2E9E2]/10" />
              <div className="h-3 w-5 bg-[#1A1210]/10 dark:bg-[#F2E9E2]/10" />
            </div>
            <ul className="mt-3 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <li key={i} className="border-t border-[#1A1210]/10 pt-3 first:border-t-0 first:pt-0 dark:border-[#F2E9E2]/10">
                  <div className="h-4 w-full bg-[#1A1210]/10 dark:bg-[#F2E9E2]/10" />
                  <div className="mt-1.5 h-4 w-2/3 bg-[#1A1210]/10 dark:bg-[#F2E9E2]/10" />
                  <div className="mt-2 h-3 w-1/2 bg-[#1A1210]/10 dark:bg-[#F2E9E2]/10" />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Stands in for a whole /news/[topic] body: hero plus rail, then the
 * compact-card grid. Same block order as DeskStories so nothing shifts when
 * the real desk streams in. */
export function NewsDeskSkeleton() {
  return (
    <>
      <div className="mt-8 grid animate-pulse grid-cols-1 gap-x-10 gap-y-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <div className="aspect-video w-full bg-[#1A1210]/10 dark:bg-[#F2E9E2]/10" />
          <div className="mt-4 h-3 w-24 bg-[#1A1210]/10 dark:bg-[#F2E9E2]/10" />
          <div className="mt-2 h-9 w-5/6 bg-[#1A1210]/10 dark:bg-[#F2E9E2]/10" />
          <div className="mt-3 h-4 w-full bg-[#1A1210]/10 dark:bg-[#F2E9E2]/10" />
          <div className="mt-1.5 h-4 w-4/5 bg-[#1A1210]/10 dark:bg-[#F2E9E2]/10" />
        </div>
        <div className="flex flex-col lg:col-span-5 lg:border-l lg:border-[#1A1210]/15 lg:pl-10 lg:dark:border-[#F2E9E2]/15">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="flex gap-4 border-t border-[#1A1210]/10 py-5 first:border-t-0 first:pt-0 dark:border-[#F2E9E2]/10"
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
      <ul className="mt-10 grid animate-pulse grid-cols-1 gap-x-10 gap-y-7 border-t border-[#1A1210]/12 pt-8 sm:grid-cols-2 lg:grid-cols-3 dark:border-[#F2E9E2]/12">
        {Array.from({ length: 3 }).map((_, i) => (
          <li key={i} className="flex gap-3">
            <div className="h-16 w-16 shrink-0 bg-[#1A1210]/10 dark:bg-[#F2E9E2]/10" />
            <div className="min-w-0 flex-1">
              <div className="h-4 w-full bg-[#1A1210]/10 dark:bg-[#F2E9E2]/10" />
              <div className="mt-2 h-4 w-2/3 bg-[#1A1210]/10 dark:bg-[#F2E9E2]/10" />
            </div>
          </li>
        ))}
      </ul>
    </>
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
