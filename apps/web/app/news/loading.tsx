import { NewsFrontSkeleton, NewsMoreSkeleton } from "@/components/NewsSkeleton";
import { SkeletonBar } from "@/components/PageSkeleton";
import { newsSerif, newsSans } from "./fonts";

/**
 * NewsPage itself isn't a blocking async component (it streams its two
 * sections behind their own Suspense boundaries with NewsFrontSkeleton /
 * NewsMoreSkeleton already) — this route-level loading.tsx just covers the
 * client-side navigation round-trip to get there, reusing those same
 * skeletons so there's no visual handoff between this and the page's own
 * internal streaming state.
 */
export default function Loading() {
  return (
    <div className={`${newsSerif.variable} ${newsSans.variable} mx-auto max-w-7xl px-4 py-8 sm:px-6`}>
      <header className="border-b-4 border-black pb-3 dark:border-white">
        <SkeletonBar className="h-3 w-40" />
        <SkeletonBar className="mt-2 h-10 w-72" />
        <SkeletonBar className="mt-2 h-4 w-full max-w-xl" />
      </header>

      <div className="mt-8">
        <NewsFrontSkeleton />
      </div>

      <div className="mt-14">
        <SkeletonBar className="h-4 w-40" />
        <NewsMoreSkeleton />
      </div>
    </div>
  );
}
