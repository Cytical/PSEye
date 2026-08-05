"use client";

import { useLayoutEffect, useRef, useState } from "react";

/**
 * Makes `reference`'s rendered height the source of truth for `matched`'s
 * height, from `lg` up — used to pin "Balance sheet & income statement" to
 * the "About" panel beside it. Financial statements always have the same
 * fixed row count, while a company's description varies a lot in length, so
 * this deliberately isn't symmetric: About always renders at its own natural
 * height, and Balance sheet is capped to match it (its `Panel` needs
 * `scroll` to handle whatever content doesn't fit).
 *
 * Pure CSS can't do this without either side hard-coding a height: a flex
 * row's `align-items: stretch` sizes the row to the *taller* natural child,
 * so if financials ever render taller than a short description, About would
 * get stretched to match Balance sheet instead of the other way around —
 * the exact "wrong side driving the height" behavior this exists to avoid.
 *
 * `referenceClassName`/`matchedClassName` carry the flex-item sizing (basis/
 * grow) that would otherwise sit on the panels themselves — this component's
 * two wrapper divs are the actual flex children of the row, not the panels,
 * since a `display: contents` wrapper (which would let the panels stay the
 * direct flex children) generates no box at all, and ResizeObserver can't
 * measure something with no box.
 *
 * `matched` gets the height via a `--match-height` CSS custom property
 * rather than an inline `height` style directly, so `matchedClassName` can
 * gate its use to `lg:h-[var(--match-height)]` — below `lg` the row stacks
 * to a single column and neither panel should be height-constrained. Starts
 * at `--match-height: auto` (no constraint) until the first measurement
 * lands after mount, so there's no server/client mismatch or a flash of a
 * clipped panel before JS runs.
 */
export function MatchHeight({
  reference,
  referenceClassName,
  matched,
  matchedClassName,
}: {
  reference: React.ReactNode;
  referenceClassName?: string;
  matched: React.ReactNode;
  matchedClassName?: string;
}) {
  const refBox = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = refBox.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const h = entries[0]?.contentRect.height;
      if (h) setHeight(Math.ceil(h));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div ref={refBox} className={referenceClassName}>
        {reference}
      </div>
      <div
        className={matchedClassName}
        style={{ "--match-height": height != null ? `${height}px` : "auto" } as React.CSSProperties}
      >
        {matched}
      </div>
    </>
  );
}
