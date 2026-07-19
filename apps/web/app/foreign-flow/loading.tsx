import { SkeletonHeader, SkeletonRect, SkeletonTable } from "@/components/PageSkeleton";

/** Matches ForeignFlowPage's shell: header, chart, then a two-column top-buy/top-sell list. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8">
      <SkeletonHeader titleClassName="h-7 w-52" subtitleClassName="h-4 w-full max-w-xl" />
      <div className="mt-8 rounded-lg bg-panel p-4 ring-1 ring-panel-border">
        <SkeletonRect className="h-40 w-full" />
      </div>
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div className="rounded-lg bg-panel p-4 ring-1 ring-panel-border">
          <SkeletonTable rows={5} />
        </div>
        <div className="rounded-lg bg-panel p-4 ring-1 ring-panel-border">
          <SkeletonTable rows={5} />
        </div>
      </div>
    </div>
  );
}
