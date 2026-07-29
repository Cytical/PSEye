/**
 * Small "(i)" hover/focus target that reveals a one-line definition — used
 * next to metric labels whose meaning isn't obvious from the label alone
 * (Sharpe ratio, VaR, skewness, etc.). Pure CSS (group-hover/group-focus),
 * no client JS, so it can sit inside the static server-rendered analytics
 * panels without forcing them to become client components. A `<button>`
 * (not a span) so it's keyboard-focusable — `group-focus-within` reveals the
 * tooltip for keyboard/touch users who can't hover.
 */
export function InfoTip({ text }: { text: string }) {
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
      </span>
    </span>
  );
}
