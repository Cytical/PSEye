import { SkeletonPageShell, SkeletonRect, SkeletonStatGrid, SkeletonTableCard } from "@/components/PageSkeleton";

/**
 * Route-level fallback shown the instant a visitor navigates here, while
 * the clustering runs over the closing-price history.
 * Shapes mirror page.tsx so nothing jumps when the real content arrives.
 */
export default function Loading() {
  return (
    <SkeletonPageShell titleClassName="h-8 w-52">
      <SkeletonStatGrid count={4} />
      <SkeletonRect className="mt-6 h-[400px] w-full" />
      <SkeletonTableCard rows={8} />
    </SkeletonPageShell>
  );
}
