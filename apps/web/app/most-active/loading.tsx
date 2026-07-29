import { SkeletonPageShell, SkeletonTableCard } from "@/components/PageSkeleton";

/**
 * Route-level fallback shown the instant a visitor navigates here, while
 * the volume/value leaders resolve.
 * Shapes mirror page.tsx so nothing jumps when the real content arrives.
 */
export default function Loading() {
  return (
    <SkeletonPageShell titleClassName="h-8 w-52">
      <SkeletonTableCard rows={12} />
    </SkeletonPageShell>
  );
}
