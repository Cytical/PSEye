import { SkeletonPageShell, SkeletonProse } from "@/components/PageSkeleton";

/**
 * Route-level fallback shown the instant a visitor navigates here, while
 * the page's own content resolves. Shapes mirror page.tsx so nothing jumps
 * when the real content arrives.
 */
export default function Loading() {
  return (
    <SkeletonPageShell width="max-w-2xl" titleClassName="h-7 w-72" subtitleClassName="h-4 w-full max-w-md">
      <SkeletonProse paragraphs={4} className="mt-8" />
    </SkeletonPageShell>
  );
}
