import { SkeletonPageShell, SkeletonRect, SkeletonStatGrid, SkeletonTableCard } from "@/components/PageSkeleton";

/**
 * Route-level fallback shown the instant a visitor navigates here, while
 * the regime statistics are computed server-side.
 * Shapes mirror page.tsx so nothing jumps when the real content arrives.
 */
export default function Loading() {
  return (
    <SkeletonPageShell titleClassName="h-8 w-48">
      <SkeletonStatGrid count={4} />
      <SkeletonRect className="mt-6 h-[340px] w-full" />
      <SkeletonTableCard rows={8} />
    </SkeletonPageShell>
  );
}
