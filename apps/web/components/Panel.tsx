import type { ReactNode } from "react";

/**
 * The one card shell every /stocks/[ticker] dashboard section uses.
 *
 * Before this, some sections were bordered cards with their heading *inside*
 * (Analytics, Statistical profile) and others were naked columns with a bare
 * `<h2 class="kicker">` floating *above* them (About, Sector peers, News,
 * Disclosures) — same content, two different visual weights, which is most of
 * what made the page read as messy.
 *
 * It's a flex column with `min-h-0` on purpose: the dashboard rows give each
 * panel a fixed height, and a scrollable body can only actually scroll inside
 * a flex child whose min-height is 0 rather than the default `auto` (which
 * floors at the content's intrinsic height and pushes the row taller instead).
 */
export function Panel({
  title,
  meta,
  footer,
  children,
  className = "",
  bodyClassName = "",
  scroll = false,
  flush = false,
}: {
  title: string;
  /** Right-aligned context in the header — sample size, window, source. */
  meta?: ReactNode;
  /** Pinned below the scroll area, so a "see all →" link stays visible. */
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  /**
   * Long lists: keep the panel at its row height and scroll the body instead.
   *
   * Only from `lg` up — the same breakpoint that gives the dashboard rows a
   * fixed height in the first place. Below it the panel has no height to stay
   * within, so an inner scroller has nothing to buy and costs a lot: a touch
   * drag that starts anywhere inside one of these panels (and on a phone they
   * are full-width blocks stacked down the whole page) is captured by the inner
   * scroll container instead of moving the page, and `.panel-scroll`'s
   * `overscroll-behavior: contain` then stops it from chaining back out. The
   * panels with no mobile height cap were the worst of it: `overflow-y: auto`
   * makes an element a scroll container even when its content fits and there is
   * nothing to scroll, so `contain` swallowed the gesture outright and the page
   * simply would not move. Below `lg` the body now takes its natural height and
   * the page scrolls, which is what the layout already assumed happened there.
   */
  scroll?: boolean;
  /** Drop body padding for edge-to-edge content (divided lists, charts). */
  flush?: boolean;
}) {
  return (
    <section
      className={`flex min-h-0 flex-col overflow-hidden rounded-xl bg-panel shadow-sm shadow-black/5 ring-1 ring-panel-border ${className}`}
    >
      <header className="flex shrink-0 items-baseline justify-between gap-2 border-b border-panel-border px-3 py-1.5">
        <h2 className="kicker truncate text-panel-fg/68">{title}</h2>
        {meta && <span className="shrink-0 text-[10.5px] text-panel-fg/60">{meta}</span>}
      </header>
      <div
        className={`min-h-0 flex-1 ${flush ? "" : "px-3 py-2.5"} ${scroll ? "panel-scroll lg:overflow-y-auto" : ""} ${bodyClassName}`}
      >
        {children}
      </div>
      {footer && (
        <footer className="shrink-0 border-t border-panel-border px-3 py-1.5 text-[11px]">{footer}</footer>
      )}
    </section>
  );
}
