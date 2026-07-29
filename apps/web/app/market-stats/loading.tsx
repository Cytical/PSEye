import { SkeletonPageShell, SkeletonStatGrid, SkeletonTableCard } from "@/components/PageSkeleton";

/**
 * Route-level fallback shown the instant a visitor navigates here, while
 * the day's aggregate market statistics resolve.
 * Shapes mirror page.tsx so nothing jumps when the real content arrives.
 */
export default function Loading() {
  return (
    <SkeletonPageShell titleClassName="h-8 w-56">
      <SkeletonStatGrid count={8} />
      <SkeletonTableCard rows={8} />
    </SkeletonPageShell>
  );
}
