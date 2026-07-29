import Link from "next/link";

/**
 * Small "(i)" hover/focus target that reveals a one-line definition — used
 * next to metric labels whose meaning isn't obvious from the label alone
 * (Sharpe ratio, VaR, skewness, etc.). Pure CSS (group-hover/group-focus),
 * no client JS, so it can sit inside the static server-rendered analytics
 * panels without forcing them to become client components. A `<button>`
 * (not a span) so it's keyboard-focusable — `group-focus-within` reveals the
 * tooltip for keyboard/touch users who can't hover.
 *
 * `glossaryId` is optional (the "See also" ids in lib/glossary.ts) — when
 * given, the tooltip gets a "Learn more" link into the full glossary entry.
 * The hover-only definition here was the whole finding this fixes: a
 * first-time visitor has to already know what "Sharpe ratio" means to get
 * anything from a one-line tooltip, and the glossary's fuller explanation
 * (with related terms) was previously only reachable via the footer, not
 * from the jargon itself. The tooltip stays `pointer-events-none` at the
 * outer level (so it doesn't intercept hover/clicks meant for the page
 * behind it) but the link itself opts back into `pointer-events-auto` so it's
 * actually clickable — and reachable by keyboard, since it's the next Tab
 * stop after the "i" button and `group-focus-within` keeps the tooltip open
 * while it or the button holds focus.
 */
export function InfoTip({ text, glossaryId }: { text: string; glossaryId?: string }) {
  return (
    <span className="group relative ml-1 inline-flex align-middle">
      <button
        type="button"
        aria-label={text}
        className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] font-semibold text-panel-fg/50 ring-1 ring-panel-fg/30 hover:text-panel-fg/80 hover:ring-panel-fg/50 focus-visible:text-panel-fg/80 focus-visible:outline-none focus-visible:ring-accent"
      >
        i
      </button>
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 hidden w-48 -translate-x-1/2 rounded-md bg-panel-raised p-2 text-[11px] font-normal leading-snug text-panel-fg shadow-lg ring-1 ring-panel-border group-hover:block group-focus-within:block"
      >
        {text}
        {glossaryId && (
          <Link
            href={`/glossary/${glossaryId}`}
            className="pointer-events-auto mt-1 block font-medium text-accent underline"
          >
            Learn more →
          </Link>
        )}
      </span>
    </span>
  );
}
