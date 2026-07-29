import { SkeletonPageShell, SkeletonTableCard, SkeletonToolbar } from "@/components/PageSkeleton";

/**
 * Route-level fallback shown the instant a visitor navigates here, while
 * the dividend screener rows resolve.
 * Shapes mirror page.tsx so nothing jumps when the real content arrives.
 */
export default function Loading() {
  return (
    <SkeletonPageShell titleClassName="h-8 w-56">
      <SkeletonToolbar count={3} />
      <SkeletonTableCard className="mt-4" rows={12} />
    </SkeletonPageShell>
  );
}
