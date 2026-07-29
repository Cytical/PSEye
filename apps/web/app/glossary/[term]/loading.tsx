import { SkeletonBar, SkeletonProse } from "@/components/PageSkeleton";

/**
 * Route-level fallback shown the instant a visitor navigates here, while
 * that term's definition resolves.
 * Shapes mirror page.tsx so nothing jumps when the real content arrives.
 */
export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      {/* Breadcrumb, then the term itself as the heading. */}
      <SkeletonBar className="h-3 w-48" />
      <SkeletonBar className="mt-2 h-8 w-64" />
      <SkeletonBar className="mt-2 h-4 w-full max-w-md" />
      <SkeletonProse paragraphs={3} />
    </div>
  );
}
