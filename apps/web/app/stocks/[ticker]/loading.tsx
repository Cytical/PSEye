import { SkeletonBar, SkeletonRect, SkeletonCardList } from "@/components/PageSkeleton";

/** Matches StockPage's shell: breadcrumb, title row, 4 stat tiles, chart, then a two-column list. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <SkeletonBar className="h-3 w-40" />

      <div className="mt-3 flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <SkeletonBar className="h-7 w-64" />
          <SkeletonBar className="mt-2 h-4 w-80" />
        </div>
        <SkeletonBar className="h-8 w-36 rounded-md" />
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-md border border-panel-border p-3">
            <SkeletonBar className="h-3 w-12" />
            <SkeletonBar className="mt-1.5 h-5 w-16" />
          </div>
        ))}
      </div>

      <div className="mt-6">
        <SkeletonRect className="h-48 w-full" />
      </div>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <SkeletonCardList count={3} />
        <SkeletonCardList count={3} />
      </div>
    </div>
  );
}
