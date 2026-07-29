import { SkeletonBar, SkeletonRect } from "@/components/PageSkeleton";

/** One dashboard panel: header strip plus a body placeholder, matching Panel.tsx's chrome. */
function SkeletonPanel({ className = "", bodyClassName = "h-full w-full" }: { className?: string; bodyClassName?: string }) {
  return (
    <div className={`flex min-h-0 flex-col overflow-hidden rounded-xl bg-panel shadow-sm shadow-black/5 ring-1 ring-panel-border ${className}`}>
      <div className="flex shrink-0 items-center justify-between border-b border-panel-border px-3 py-2">
        <SkeletonBar className="h-2.5 w-24" />
        <SkeletonBar className="h-2.5 w-14" />
      </div>
      <div className="min-h-0 flex-1 p-3">
        <SkeletonRect className={bodyClassName} />
      </div>
    </div>
  );
}

/**
 * Mirrors StockPage's dashboard shell — title row, breadcrumb/meta line, the
 * hero strip, and the two fixed-height panel rows — at the same widths and
 * heights the real page uses, so nothing jumps when the content streams in.
 * Kept in sync with `DASH_ROW`/`SPAN_WIDE`/`SPAN_SIDE` in page.tsx.
 */
export default function Loading() {
  const row = "flex flex-col gap-3 lg:h-[19.5rem] lg:flex-row 2xl:h-[21rem]";
  const wide = "min-w-0 lg:basis-1/2 lg:grow-[2]";
  const side = "min-w-0 lg:basis-1/4 lg:grow";

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-8 pt-4 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-center gap-2">
          <SkeletonBar className="size-5 rounded-full" />
          <SkeletonBar className="h-6 w-64" />
        </div>
        <div className="flex items-center gap-2">
          <SkeletonBar className="h-7 w-20 rounded-md" />
          <SkeletonBar className="h-7 w-36 rounded-md" />
        </div>
      </div>
      <SkeletonBar className="mt-2 h-3 w-96 max-w-full" />

      {/* Hero strip */}
      <div className="mt-3 flex flex-col gap-x-5 gap-y-3 rounded-xl bg-panel p-3 shadow-sm shadow-black/5 ring-1 ring-panel-border lg:flex-row">
        <div className="lg:w-[190px] lg:shrink-0">
          <SkeletonBar className="h-8 w-40" />
          <SkeletonBar className="mt-2 h-2.5 w-28" />
          <SkeletonRect className="mt-2 h-8 w-full" />
        </div>
        <div className="lg:w-[210px] lg:shrink-0 lg:border-l lg:border-panel-border lg:pl-5">
          <SkeletonBar className="h-2.5 w-24" />
          <SkeletonBar className="mt-3 h-1.5 w-full rounded-full" />
          <SkeletonBar className="mt-2.5 h-2.5 w-full" />
        </div>
        <div className="grid flex-1 grid-cols-[repeat(auto-fit,minmax(84px,1fr))] gap-x-4 gap-y-2.5 lg:border-l lg:border-panel-border lg:pl-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <SkeletonBar className="h-2.5 w-14" />
              <SkeletonBar className="mt-1.5 h-4 w-16" />
            </div>
          ))}
        </div>
      </div>

      <div className={`mt-3 ${row}`}>
        <SkeletonPanel className={wide} bodyClassName="h-56 w-full lg:h-full" />
        <SkeletonPanel className={side} bodyClassName="h-56 w-full lg:h-full" />
        <SkeletonPanel className={side} bodyClassName="h-56 w-full lg:h-full" />
      </div>

      <div className={`mt-3 ${row}`}>
        <SkeletonPanel className={wide} bodyClassName="h-56 w-full lg:h-full" />
        <SkeletonPanel className={side} bodyClassName="h-56 w-full lg:h-full" />
        <SkeletonPanel className={side} bodyClassName="h-56 w-full lg:h-full" />
      </div>
    </div>
  );
}
