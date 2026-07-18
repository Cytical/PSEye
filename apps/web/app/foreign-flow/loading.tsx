import { SkeletonHeader, SkeletonRect, SkeletonTable } from "@/components/PageSkeleton";

/** Matches ForeignFlowPage's shell: header, chart, then a two-column top-buy/top-sell list. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <SkeletonHeader titleClassName="h-6 w-52" subtitleClassName="h-4 w-full max-w-xl" />
      <div className="mt-6">
        <SkeletonRect className="h-40 w-full" />
      </div>
      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <SkeletonTable rows={5} />
        <SkeletonTable rows={5} />
      </div>
    </div>
  );
}
