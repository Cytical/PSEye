import { SkeletonPageShell, SkeletonTableCard } from "@/components/PageSkeleton";

/**
 * Route-level fallback shown the instant a visitor navigates here, while the
 * full board resolves server-side.
 * Shapes mirror page.tsx so nothing jumps when the real content arrives.
 */
export default function Loading() {
  return (
    <SkeletonPageShell titleClassName="h-8 w-52">
      <SkeletonTableCard className="mt-4" rows={6} />
    </SkeletonPageShell>
  );
}
