import { SkeletonBar, SkeletonRect } from "@/components/PageSkeleton";

/**
 * Mirrors MarketMapPage's real shell (page.tsx + MarketMap.tsx): headline row,
 * then a sidebar column beside the treemap canvas, with the legend strip below
 * the canvas.
 *
 * The previous version was a lone `h-[70vh]` rectangle with no sidebar and no
 * legend, against a real canvas that is roughly 1.6:1 next to a 208px sidebar —
 * so the skeleton and the page it stood in for were different shapes and the
 * handover visibly jumped. Canvas shape here is the same aspect-ratio +
 * min/max-height clamp TreemapChart's MAP_ASPECT applies; keep them in step.
 */
export default function Loading() {
  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:py-10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <SkeletonBar className="h-3 w-28" />
          <SkeletonBar className="mt-3 h-11 w-[min(80vw,34rem)]" />
        </div>
        <div className="flex shrink-0 gap-2">
          <SkeletonBar className="h-8 w-24 rounded-md" />
          <SkeletonBar className="h-8 w-20 rounded-md" />
        </div>
      </div>

      {/* Breakpoint is lg, matching MarketMap.tsx: below that the real page
          puts the sidebar under the map as a full-width strip. */}
      <div className="mt-6 flex flex-col gap-4 lg:flex-row">
        <div className="order-2 flex shrink-0 flex-col gap-2 rounded-xl bg-panel p-2 ring-1 ring-panel-border lg:order-none lg:mt-6 lg:w-52 xl:w-56">
          <SkeletonBar className="h-14 w-full rounded-md" />
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonBar key={i} className="h-8 w-full rounded-md" />
          ))}
          <SkeletonBar className="mt-2 h-24 w-full rounded-md" />
        </div>
        <div className="order-1 flex min-w-0 flex-1 flex-col items-center gap-2.5 lg:order-none">
          <SkeletonRect className="aspect-[1.62/1] max-h-[860px] min-h-[520px] w-full rounded-xl" />
          <SkeletonBar className="h-6 w-full max-w-[620px] rounded-md" />
        </div>
      </div>
    </div>
  );
}
