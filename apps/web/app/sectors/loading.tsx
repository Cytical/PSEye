import { SkeletonBar, SkeletonPageShell } from "@/components/PageSkeleton";

/**
 * Route-level fallback shown the instant a visitor navigates here, while
 * the sector roll-ups resolve.
 * Shapes mirror page.tsx so nothing jumps when the real content arrives.
 */
export default function Loading() {
  return (
    <SkeletonPageShell titleClassName="h-8 w-40">
      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="rounded-xl bg-panel p-4 shadow-sm shadow-black/5 ring-1 ring-panel-border">
            <SkeletonBar className="h-5 w-40" />
            <SkeletonBar className="mt-2 h-3 w-28" />
            <SkeletonBar className="mt-3 h-3 w-32" />
          </div>
        ))}
      </div>
    </SkeletonPageShell>
  );
}
