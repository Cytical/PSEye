import { SkeletonPageShell, SkeletonTableCard, SkeletonToolbar } from "@/components/PageSkeleton";

/**
 * Route-level fallback shown the instant a visitor navigates here, while
 * the full screener row set resolves.
 * Shapes mirror page.tsx so nothing jumps when the real content arrives.
 */
export default function Loading() {
  return (
    <SkeletonPageShell titleClassName="h-8 w-44">
      <SkeletonToolbar count={4} />
      <SkeletonTableCard className="mt-4" rows={14} />
    </SkeletonPageShell>
  );
}
