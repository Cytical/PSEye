import { SkeletonBar, SkeletonRect } from "@/components/PageSkeleton";

/** Matches MarketMapPage's shell (page.tsx): header row + treemap canvas below. */
export default function Loading() {
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8">
      <div className="flex items-start justify-between gap-3">
        <SkeletonBar className="h-6 w-48" />
        <SkeletonBar className="h-8 w-24 rounded-md" />
      </div>
      <div className="mt-6">
        <SkeletonRect className="h-[70vh] w-full" />
      </div>
    </div>
  );
}
