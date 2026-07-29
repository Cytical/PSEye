import { SkeletonBar, SkeletonPageShell, SkeletonProse } from "@/components/PageSkeleton";

/**
 * Route-level fallback shown the instant a visitor navigates here, while
 * the glossary entries resolve.
 * Shapes mirror page.tsx so nothing jumps when the real content arrives.
 */
export default function Loading() {
  return (
    <SkeletonPageShell width="max-w-3xl" titleClassName="h-8 w-72" subtitleClassName="h-4 w-full max-w-lg">
      {/* The "Jump to term" chip row above the definitions. */}
      <div className="mt-3 flex flex-wrap gap-x-2 gap-y-1">
        {Array.from({ length: 16 }).map((_, i) => (
          <SkeletonBar key={i} className="h-4 w-20" />
        ))}
      </div>
      <SkeletonProse paragraphs={6} />
    </SkeletonPageShell>
  );
}
