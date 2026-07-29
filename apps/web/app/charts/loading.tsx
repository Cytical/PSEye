import { SkeletonPageShell, SkeletonRect } from "@/components/PageSkeleton";

/**
 * Route-level fallback shown the instant a visitor navigates here, while
 * the TradingView embed loads its third-party script.
 * Shapes mirror page.tsx so nothing jumps when the real content arrives.
 */
export default function Loading() {
  return (
    <SkeletonPageShell width="max-w-[1400px]" titleClassName="h-8 w-36" subtitleClassName="h-4 w-full max-w-2xl">
      <SkeletonRect className="mt-6 h-[520px] w-full" />
    </SkeletonPageShell>
  );
}
