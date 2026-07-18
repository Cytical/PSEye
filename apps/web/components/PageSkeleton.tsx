/**
 * Shared building blocks for route-level `loading.tsx` files. Next.js shows
 * these instantly on navigation (and updates the URL right away) while the
 * target route's async Server Component fetches its data in the background —
 * see each route's loading.tsx for how these compose into that page's shape,
 * so the skeleton doesn't visually jump once the real content streams in.
 */
export function SkeletonBar({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded bg-panel-fg/10 ${className}`} />;
}

export function SkeletonHeader({
  titleClassName = "h-7 w-56",
  subtitleClassName = "h-4 w-full max-w-md",
}: {
  titleClassName?: string;
  subtitleClassName?: string;
}) {
  return (
    <div>
      <SkeletonBar className={titleClassName} />
      <SkeletonBar className={`mt-2 ${subtitleClassName}`} />
    </div>
  );
}

/** Matches the disclosures/calendar/offerings "grouped card" list shape. Caller controls top spacing. */
export function SkeletonCardList({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-lg bg-panel ring-1 ring-panel-border p-4">
          <SkeletonBar className="h-4 w-1/3" />
          <div className="mt-3 flex flex-col gap-2">
            <SkeletonBar className="h-3 w-full" />
            <SkeletonBar className="h-3 w-5/6" />
          </div>
        </div>
      ))}
    </div>
  );
}

const ROW_WIDTHS = ["w-full", "w-11/12", "w-full", "w-4/5", "w-full", "w-5/6", "w-full", "w-3/4"];

/** Matches a simple header-row table (block-sales, foreign-flow's index table). Caller controls top spacing. */
export function SkeletonTable({ rows = 6 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-2.5">
      <SkeletonBar className="h-3 w-1/4" />
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonBar key={i} className={`h-3 ${ROW_WIDTHS[i % ROW_WIDTHS.length]}`} />
      ))}
    </div>
  );
}

/** Generic large placeholder for a chart/canvas/calculator widget. */
export function SkeletonRect({ className = "h-64 w-full" }: { className?: string }) {
  return <div className={`animate-pulse rounded-lg bg-panel-raised ${className}`} />;
}
