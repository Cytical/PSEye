"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";

const TOOLTIP_WIDTH = 192; // matches w-48 below
const EDGE_MARGIN = 8;
/** Below this much room above the icon, the tooltip opens downward instead —
 * generous enough for the tallest case (a two-line hint plus the "Learn more"
 * link) without needing to measure the rendered tooltip itself. */
const MIN_ROOM_ABOVE = 160;

interface TooltipPosition {
  left: number;
  anchorY: number;
  openAbove: boolean;
}

/**
 * Small "(i)" hover/focus target that reveals a one-line definition — used
 * next to metric labels whose meaning isn't obvious from the label alone
 * (Sharpe ratio, VaR, skewness, etc.).
 *
 * Portaled to `document.body` and positioned with `position: fixed` (computed
 * from the trigger's own on-screen rect on hover/focus) rather than a plain
 * CSS `absolute` popover — every one of these lives inside a Panel (see
 * Panel.tsx), whose card shell needs `overflow-hidden`/`overflow-y-auto` to
 * clip rounded corners and enable internal scrolling, and a scroll container
 * clipping its own overflowing descendants is inherent to how CSS scrolling
 * works (confirmed live: roughly 3 in 4 of these tooltips were rendering
 * fully or partially outside the visible page, on both axes, with no way to
 * escape via `absolute` alone). `position: fixed` is not clipped by an
 * ordinary `overflow` ancestor — only by one that also establishes a
 * containing block (a `transform`/`filter`/etc.), which no Panel sets — so a
 * portal is the fix, not a request to change Panel's own overflow.
 *
 * `glossaryId` is optional (the "See also" ids in lib/glossary.ts) — when
 * given, the tooltip gets a "Learn more" link into the full glossary entry.
 */
export function InfoTip({ text, glossaryId }: { text: string; glossaryId?: string }) {
  const [pos, setPos] = useState<TooltipPosition | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  function show() {
    const rect = btnRef.current?.getBoundingClientRect();
    if (!rect) return;
    const openAbove = rect.top > MIN_ROOM_ABOVE;
    const left = Math.max(
      EDGE_MARGIN,
      Math.min(rect.left + rect.width / 2 - TOOLTIP_WIDTH / 2, window.innerWidth - TOOLTIP_WIDTH - EDGE_MARGIN)
    );
    setPos({ left, anchorY: openAbove ? rect.top - 6 : rect.bottom + 6, openAbove });
  }

  function hide() {
    setPos(null);
  }

  return (
    <span className="relative ml-1 inline-flex align-middle">
      <button
        ref={btnRef}
        type="button"
        aria-label={text}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-[9px] font-semibold text-panel-fg/50 ring-1 ring-panel-fg/30 hover:text-panel-fg/80 hover:ring-panel-fg/50 focus-visible:text-panel-fg/80 focus-visible:outline-none focus-visible:ring-accent"
      >
        i
      </button>
      {pos &&
        typeof document !== "undefined" &&
        createPortal(
          <span
            role="tooltip"
            className="pointer-events-none fixed z-50 w-48 rounded-md bg-panel-raised p-2 text-[11px] font-normal leading-snug text-panel-fg shadow-lg ring-1 ring-panel-border"
            style={{
              left: pos.left,
              top: pos.openAbove ? undefined : pos.anchorY,
              bottom: pos.openAbove ? window.innerHeight - pos.anchorY : undefined,
            }}
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
          </span>,
          document.body
        )}
    </span>
  );
}
