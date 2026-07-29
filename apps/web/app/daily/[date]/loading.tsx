import { SkeletonBar, SkeletonRect } from "@/components/PageSkeleton";

/** One recap panel: header strip plus a body placeholder, matching DailyRecapPanels' Panel chrome. */
function SkeletonPanel({ className = "", bodyClassName = "h-40 w-full" }: { className?: string; bodyClassName?: string }) {
  return (
    <div className={`flex min-h-0 flex-col overflow-hidden rounded-xl bg-panel shadow-sm shadow-black/5 ring-1 ring-panel-border ${className}`}>
      <div className="flex shrink-0 items-center justify-between border-b border-panel-border px-3 py-2">
        <SkeletonBar className="h-2.5 w-28" />
        <SkeletonBar className="h-2.5 w-12" />
      </div>
      <div className="p-3">
        <SkeletonRect className={bodyClassName} />
      </div>
    </div>
  );
}

/**
 * Route-level fallback shown the instant a visitor navigates here, while
 * that day's recap is read from the database.
 * Shapes mirror page.tsx so nothing jumps when the real content arrives.
 */
export default function Loading() {
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <SkeletonBar className="h-3 w-28" />
          <SkeletonBar className="mt-2 h-7 w-72" />
        </div>
        <SkeletonBar className="h-8 w-48 rounded-md" />
      </div>

      {/* Share card */}
      <SkeletonRect className="mt-4 h-56 w-full" />

      {/* Movers row: gainers / losers / most active */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <SkeletonPanel />
        <SkeletonPanel />
        <SkeletonPanel />
      </div>

      {/* Flow / breadth / news / disclosures */}
      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <SkeletonPanel bodyClassName="h-48 w-full" />
        <SkeletonPanel bodyClassName="h-48 w-full" />
        <SkeletonPanel bodyClassName="h-48 w-full" />
        <SkeletonPanel bodyClassName="h-48 w-full" />
      </div>
    </div>
  );
}
