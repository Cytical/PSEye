"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

/** Fixed width of the popover, in px. Needed as a number (not just a Tailwind
 * class) because the placement math below has to know it before the panel is
 * on screen. */
const POPOVER_WIDTH = 260;
/** Gap between the trigger and the popover. */
const POPOVER_GAP = 8;
/** Minimum breathing room between the popover and the viewport edges. */
const VIEWPORT_MARGIN = 8;
/** Height assumed for the very first placement pass, before the panel has been
 * measured. A month grid is ~330px; the real number replaces it in the same
 * layout effect, before paint. */
const ASSUMED_POPOVER_HEIGHT = 330;

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max);
}

function isoOf(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function parseIso(iso: string): { year: number; month: number } {
  const [y, m] = iso.split("-").map(Number);
  return { year: y, month: m - 1 };
}

/**
 * Popover month-grid calendar shared by Market Map's Time Machine and Daily
 * Recap's date nav — both only have data for a sparse, known set of trading
 * days, so `availableDates` (rather than a min/max range) is what actually
 * makes a day selectable; every other day in the grid renders but is disabled
 * so the shape of the calendar stays a normal month instead of a filtered list.
 */
export function CalendarDatePicker({
  value,
  availableDates,
  onSelect,
  onClear,
  clearLabel = "Today",
  triggerLabel,
  className = "",
  triggerClassName = "",
  align = "left",
}: {
  /** Selected date, ISO yyyy-mm-dd, or null if nothing/"today" is selected. */
  value: string | null;
  /** ISO dates that can be clicked; anything else in the grid is disabled. */
  availableDates: string[];
  onSelect: (iso: string) => void;
  /** If provided, renders a quick-action button (e.g. "back to today/latest"). */
  onClear?: () => void;
  clearLabel?: string;
  /** Text shown on the trigger button, e.g. "Jul 24, 2026" or "Today". */
  triggerLabel: string;
  className?: string;
  /** Extra classes on the trigger button itself, for callers that need it to
   * fill its container rather than sit as an inline pill (Market Map's
   * sidebar). Appended, so it can override the defaults. */
  triggerClassName?: string;
  /**
   * Which edge of the trigger the popover hangs from. Default "left" grows the
   * 260px popover rightward from the trigger's left edge; "right" anchors its
   * right edge to the trigger and grows leftward. Either way the placement
   * math clamps the result inside the viewport, so this is a preference about
   * which side the popover *prefers* to open toward, not a guarantee it will
   * end up there.
   */
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  /** Viewport coordinates for the portaled panel, or null on the first render
   * of an open popover (before it has been measured and placed). */
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const availableSet = useMemo(() => new Set(availableDates), [availableDates]);
  const sortedAvailable = useMemo(() => [...availableDates].sort(), [availableDates]);
  const latest = sortedAvailable[sortedAvailable.length - 1] ?? null;

  const initial = parseIso(value ?? latest ?? new Date().toISOString().slice(0, 10));
  const [viewYear, setViewYear] = useState(initial.year);
  const [viewMonth, setViewMonth] = useState(initial.month);

  /** Jumps the visible month/year back to the selected (or latest available) date —
   * called right before opening, rather than in an effect keyed on `open`, so the
   * setState happens inside the click handler instead of cascading from an effect. */
  function resetViewToAnchor() {
    const anchor = value ?? latest;
    if (anchor) {
      const p = parseIso(anchor);
      setViewYear(p.year);
      setViewMonth(p.month);
    }
  }

  /** Inside the widget for close-on-outside-click purposes: the trigger, or the
   * panel — which is portaled to <body>, so a plain `containerRef.contains`
   * would read every click on the calendar itself as an outside click. */
  function isInsideWidget(node: Node | null): boolean {
    if (!node) return false;
    return Boolean(containerRef.current?.contains(node)) || Boolean(panelRef.current?.contains(node));
  }

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!isInsideWidget(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        // Escape shouldn't drop focus on <body> — same contract as NavLinks'
        // NavDropdown, and more load-bearing here now that the panel lives in
        // a portal at the end of the document rather than next to its trigger.
        triggerRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  /**
   * Places the portaled panel against the trigger, in viewport coordinates.
   *
   * The panel used to be an ordinary `absolute` child of the trigger, which
   * meant it was part of its ancestors' scrollable content: dropped into Market
   * Map's sidebar (a `max-h`/`overflow-y-auto` column) opening the calendar
   * grew the column's scroll height by ~330px and gave it a scrollbar, so
   * "open the date picker" visibly resized the sidebar and the calendar itself
   * was clipped at the column's bottom edge. A portal plus `position: fixed`
   * takes it out of that box entirely — it now floats over the page like the
   * popup it always read as, and the sidebar's height never moves.
   *
   * The cost of `fixed` is that it no longer travels with its trigger, hence
   * the capture-phase scroll listener: it has to catch scrolling in *any*
   * ancestor (the page, or the sidebar itself), not just the window.
   */
  useLayoutEffect(() => {
    if (!open) return;
    function place() {
      const trigger = triggerRef.current;
      if (!trigger) return;
      const r = trigger.getBoundingClientRect();
      const h = panelRef.current?.offsetHeight || ASSUMED_POPOVER_HEIGHT;
      const left = clamp(
        align === "right" ? r.right - POPOVER_WIDTH : r.left,
        VIEWPORT_MARGIN,
        Math.max(VIEWPORT_MARGIN, window.innerWidth - POPOVER_WIDTH - VIEWPORT_MARGIN),
      );
      const below = r.bottom + POPOVER_GAP;
      const above = r.top - POPOVER_GAP - h;
      // Flip above the trigger only when there genuinely isn't room below and
      // there is room above; otherwise stay below and let the clamp pull it
      // back inside the viewport.
      const flip = below + h > window.innerHeight - VIEWPORT_MARGIN && above >= VIEWPORT_MARGIN;
      const top = flip
        ? above
        : clamp(below, VIEWPORT_MARGIN, Math.max(VIEWPORT_MARGIN, window.innerHeight - h - VIEWPORT_MARGIN));
      setPos({ top, left });
    }
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, align, viewYear, viewMonth]);

  function goMonth(delta: number) {
    let y = viewYear;
    let m = viewMonth + delta;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setViewYear(y);
    setViewMonth(m);
  }

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const firstWeekday = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div
      ref={containerRef}
      className={`relative inline-block ${className}`}
      // Matches NavLinks' NavDropdown: tabbing past the popover's last focusable
      // control should close it the same way clicking outside does — without
      // this, Tab could carry focus into the page behind an still-open popover.
      onBlur={(e) => {
        // React portals keep React's event bubbling, so focus moving into the
        // panel still surfaces here as a blur out of the container — hence the
        // panel check on top of the container's own.
        if (!isInsideWidget(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          if (!open) resetViewToAnchor();
          setOpen((o) => !o);
        }}
        className={`inline-flex items-center gap-1.5 rounded-md bg-panel px-2.5 py-1.5 text-sm text-panel-fg shadow-sm shadow-black/5 ring-1 ring-panel-border transition-colors hover:bg-panel-raised ${triggerClassName}`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        {triggerLabel}
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Choose a date"
            className="animate-overlay-panel fixed z-50 w-[260px] rounded-xl bg-panel p-3 shadow-xl shadow-black/25 ring-1 ring-panel-border"
            style={{
              top: pos?.top ?? 0,
              left: pos?.left ?? 0,
              // First render of an open popover has no measurement yet, so it
              // is laid out (and therefore measurable) but not painted at the
              // wrong spot. The layout effect fills `pos` in before paint.
              visibility: pos ? undefined : "hidden",
            }}
          >
            <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => goMonth(-1)}
              aria-label="Previous month"
              className="flex h-7 w-7 items-center justify-center rounded-md text-panel-fg/72 transition-colors hover:bg-panel-raised hover:text-panel-fg"
            >
              ‹
            </button>
            <span className="text-sm font-medium text-panel-fg">{monthLabel}</span>
            <button
              type="button"
              onClick={() => goMonth(1)}
              aria-label="Next month"
              className="flex h-7 w-7 items-center justify-center rounded-md text-panel-fg/72 transition-colors hover:bg-panel-raised hover:text-panel-fg"
            >
              ›
            </button>
          </div>

          <div className="mt-2 grid grid-cols-7 gap-0.5 text-center">
            {WEEKDAY_LABELS.map((w, i) => (
              <span key={i} className="text-[10px] font-medium text-panel-fg/65">
                {w}
              </span>
            ))}
            {cells.map((day, i) => {
              if (day == null) return <span key={i} />;
              const iso = isoOf(viewYear, viewMonth, day);
              const available = availableSet.has(iso);
              const selected = value === iso;
              return (
                <button
                  key={i}
                  type="button"
                  disabled={!available}
                  aria-current={selected ? "date" : undefined}
                  onClick={() => {
                    onSelect(iso);
                    setOpen(false);
                  }}
                  className={
                    selected
                      ? "flex h-7 w-7 items-center justify-center rounded-md bg-accent text-xs font-semibold text-white"
                      : available
                        ? "flex h-7 w-7 items-center justify-center rounded-md text-xs font-medium text-panel-fg transition-colors hover:bg-panel-raised"
                        : "flex h-7 w-7 items-center justify-center rounded-md text-xs text-panel-fg/20"
                  }
                >
                  {day}
                </button>
              );
            })}
          </div>

          {onClear && (
            <button
              type="button"
              onClick={() => {
                onClear();
                setOpen(false);
              }}
              className="mt-2 w-full rounded-md px-2 py-1.5 text-center text-xs font-medium text-panel-fg/72 transition-colors hover:bg-panel-raised hover:text-panel-fg"
            >
              {clearLabel}
            </button>
          )}
          </div>,
          document.body,
        )}
    </div>
  );
}
