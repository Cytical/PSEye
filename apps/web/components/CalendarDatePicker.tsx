"use client";

import { useEffect, useMemo, useRef, useState } from "react";

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

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
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

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
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          if (!open) resetViewToAnchor();
          setOpen((o) => !o);
        }}
        className="inline-flex items-center gap-1.5 rounded-md bg-panel px-2.5 py-1.5 text-sm text-panel-fg shadow-sm shadow-black/5 ring-1 ring-panel-border transition-colors hover:bg-panel-raised"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
        {triggerLabel}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Choose a date"
          className="absolute left-0 top-full z-30 mt-2 w-[260px] rounded-xl bg-panel p-3 shadow-lg shadow-black/10 ring-1 ring-panel-border"
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
        </div>
      )}
    </div>
  );
}
