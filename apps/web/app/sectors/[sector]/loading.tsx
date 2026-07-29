import { SkeletonBar, SkeletonStatGrid, SkeletonTableCard } from "@/components/PageSkeleton";

/**
 * Route-level fallback shown the instant a visitor navigates here, while
 * that sector's constituent list resolves.
 * Shapes mirror page.tsx so nothing jumps when the real content arrives.
 */
export default function Loading() {
  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8">
      {/* Breadcrumb above the sector name. */}
      <SkeletonBar className="h-3 w-44" />
      <SkeletonBar className="mt-2 h-8 w-64" />
      <SkeletonBar className="mt-2 h-4 w-full max-w-xl" />
      <SkeletonStatGrid count={4} />
      <SkeletonTableCard rows={12} />
    </div>
  );
}
