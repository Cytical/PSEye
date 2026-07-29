import { SkeletonPageShell, SkeletonRect, SkeletonStatGrid, SkeletonTableCard } from "@/components/PageSkeleton";

/**
 * Route-level fallback shown the instant a visitor navigates here, while
 * the leaderboard and correlation matrix are computed server-side.
 * Shapes mirror page.tsx so nothing jumps when the real content arrives.
 */
export default function Loading() {
  return (
    <SkeletonPageShell titleClassName="h-8 w-56">
      <SkeletonStatGrid count={4} />
      <SkeletonRect className="mt-6 h-[380px] w-full" />
      <SkeletonTableCard rows={10} />
    </SkeletonPageShell>
  );
}
