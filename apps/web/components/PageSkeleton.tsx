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
        <div key={i} className="overflow-hidden rounded-xl bg-panel shadow-sm shadow-black/5 ring-1 ring-panel-border p-4">
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

/**
 * The outer container every route repeats: centered column, page padding, and
 * the title/subtitle pair. `width` takes the same Tailwind max-w-* class the
 * real page uses — the data pages are almost all `max-w-[1240px]`, prose pages
 * `max-w-2xl`/`max-w-3xl` — so the skeleton's text column lines up with the
 * real one instead of reflowing when content arrives.
 */
export function SkeletonPageShell({
  width = "max-w-[1240px]",
  titleClassName = "h-7 w-56",
  subtitleClassName = "h-4 w-full max-w-xl",
  children,
}: {
  width?: string;
  titleClassName?: string;
  subtitleClassName?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={`mx-auto ${width} px-4 py-8`}>
      <SkeletonHeader titleClassName={titleClassName} subtitleClassName={subtitleClassName} />
      {children}
    </div>
  );
}

/** Row of KPI/stat tiles — how every analytics-style page opens. */
export function SkeletonStatGrid({ count = 4, className = "mt-6" }: { count?: number; className?: string }) {
  return (
    <div className={`grid grid-cols-2 gap-3 sm:grid-cols-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-xl bg-panel p-3 shadow-sm shadow-black/5 ring-1 ring-panel-border">
          <SkeletonBar className="h-2.5 w-20" />
          <SkeletonBar className="mt-2 h-5 w-16" />
        </div>
      ))}
    </div>
  );
}

/** Filter/sort controls that sit above a table (screener, rankings, sectors). */
export function SkeletonToolbar({ count = 3, className = "mt-6" }: { count?: number; className?: string }) {
  const widths = ["w-40", "w-28", "w-32", "w-24"];
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonBar key={i} className={`h-8 rounded-md ${widths[i % widths.length]}`} />
      ))}
    </div>
  );
}

const PROSE_WIDTHS = ["w-full", "w-full", "w-11/12", "w-4/5"];

/** Body copy for the prose routes (about, contact, glossary entries). */
export function SkeletonProse({ paragraphs = 3, className = "mt-6" }: { paragraphs?: number; className?: string }) {
  return (
    <div className={`flex flex-col gap-5 ${className}`}>
      {Array.from({ length: paragraphs }).map((_, p) => (
        <div key={p} className="flex flex-col gap-2">
          {PROSE_WIDTHS.map((w, i) => (
            <SkeletonBar key={i} className={`h-3 ${w}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

/** A table inside the panel card the data routes wrap theirs in. */
export function SkeletonTableCard({ rows = 8, className = "mt-6" }: { rows?: number; className?: string }) {
  return (
    <div className={`rounded-xl bg-panel p-4 shadow-sm shadow-black/5 ring-1 ring-panel-border ${className}`}>
      <SkeletonTable rows={rows} />
    </div>
  );
}
