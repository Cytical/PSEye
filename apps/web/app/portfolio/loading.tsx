import { SkeletonPageShell, SkeletonStatGrid, SkeletonTableCard } from "@/components/PageSkeleton";

/**
 * Route-level fallback shown the instant a visitor navigates here, while
 * the tracker mounts and reads its localStorage holdings.
 * Shapes mirror page.tsx so nothing jumps when the real content arrives.
 */
export default function Loading() {
  return (
    <SkeletonPageShell titleClassName="h-8 w-52">
      <SkeletonStatGrid count={4} />
      <SkeletonTableCard rows={6} />
    </SkeletonPageShell>
  );
}
