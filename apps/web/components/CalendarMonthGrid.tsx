"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CORPORATE_ACTION_LABELS,
  CORPORATE_ACTION_TYPE_ACCENT,
  type CorporateAction,
} from "@pseye/source-corporate-actions";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

/** How many ticker badges to stack in a single day cell before collapsing the
 * rest into a "+N" overflow indicator — matches the old dot grid's 4-item cap,
 * pulled down to 3 since a ticker badge takes far more vertical room than a dot. */
const MAX_BADGES_PER_DAY = 3;

function formatMonthHeading(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-PH", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** One `YYYY-MM` month laid out as calendar weeks (Sun-first), `null` cells
 * padding out the leading/trailing days that belong to adjacent months —
 * same shape a normal month-grid UI uses, kept in UTC throughout since every
 * date here is already a plain `YYYY-MM-DD` string, not a real instant. */
function buildCalendarWeeks(monthKey: string): (string | null)[][] {
  const [yearStr, monthStr] = monthKey.split("-");
  const year = Number(yearStr);
  const monthNum = Number(monthStr); // 1-based (e.g. 7 for July)
  const daysInMonth = new Date(Date.UTC(year, monthNum, 0)).getUTCDate();
  const firstWeekday = new Date(Date.UTC(year, monthNum - 1, 1)).getUTCDay(); // 0=Sun

  const cells: (string | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${yearStr}-${monthStr}-${String(d).padStart(2, "0")}`);
  }
  while (cells.length % 7 !== 0) cells.push(null);

  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

/** Shifts a `YYYY-MM` key by `delta` months, wrapping the year boundary in
 * either direction (Dec + 1 -> Jan of next year, Jan - 1 -> Dec of prior year). */
function shiftMonthKey(monthKey: string, delta: number): string {
  const [yearStr, monthStr] = monthKey.split("-");
  const zeroBasedMonth = Number(monthStr) - 1 + delta;
  const year = Number(yearStr) + Math.floor(zeroBasedMonth / 12);
  const month = ((zeroBasedMonth % 12) + 12) % 12;
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

/** At-a-glance month grid, rendered above the itemized list below it. Client
 * component so Prev/Next can flip the displayed month without a server
 * round-trip — `actions` is the page's already-fetched, already-small full
 * list, filtered here to whatever month is currently in view. */
export function CalendarMonthGrid({
  actions,
  initialMonthKey,
  todayIso,
}: {
  actions: CorporateAction[];
  initialMonthKey: string;
  todayIso: string;
}) {
  const [monthKey, setMonthKey] = useState(initialMonthKey);

  const monthActions = useMemo(
    () => actions.filter((a) => a.exDate.slice(0, 7) === monthKey),
    [actions, monthKey]
  );

  const weeks = useMemo(() => buildCalendarWeeks(monthKey), [monthKey]);

  const byDay = useMemo(() => {
    const map = new Map<string, CorporateAction[]>();
    for (const action of monthActions) {
      if (!map.has(action.exDate)) map.set(action.exDate, []);
      map.get(action.exDate)!.push(action);
    }
    return map;
  }, [monthActions]);

  const typesPresent = [...new Set(monthActions.map((a) => a.type))];

  return (
    <div className="rounded-xl bg-panel p-4 shadow-sm shadow-black/5 ring-1 ring-panel-border sm:p-5">
      <div className="flex items-center justify-between gap-2">
        <h2 className="kicker text-panel-fg/72">{formatMonthHeading(`${monthKey}-01`)} at a glance</h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMonthKey((m) => shiftMonthKey(m, -1))}
            aria-label="Previous month"
            className="flex h-7 w-7 items-center justify-center rounded-md text-panel-fg/72 transition-colors hover:bg-panel-raised hover:text-panel-fg"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setMonthKey((m) => shiftMonthKey(m, 1))}
            aria-label="Next month"
            className="flex h-7 w-7 items-center justify-center rounded-md text-panel-fg/72 transition-colors hover:bg-panel-raised hover:text-panel-fg"
          >
            ›
          </button>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-medium uppercase tracking-wide text-panel-fg/50">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} aria-hidden="true">
            {label}
          </div>
        ))}
      </div>

      <div className="mt-1 grid grid-cols-7 gap-1">
        {weeks.flatMap((week, weekIndex) =>
          week.map((dayIso, dayIndex) => {
            if (!dayIso) {
              return <div key={`${weekIndex}-${dayIndex}`} aria-hidden="true" />;
            }
            const dayActions = byDay.get(dayIso) ?? [];
            const isToday = dayIso === todayIso;
            const dayNum = Number(dayIso.slice(-2));
            const summary =
              dayActions.length > 0
                ? `${dayActions.length} ex-date${dayActions.length > 1 ? "s" : ""}: ${dayActions
                    .map((a) => `${a.ticker} ${CORPORATE_ACTION_LABELS[a.type]}`)
                    .join(", ")}`
                : null;
            const overflow = dayActions.length - MAX_BADGES_PER_DAY;

            return (
              <div
                key={dayIso}
                title={summary ?? undefined}
                className={`flex min-h-[76px] flex-col items-center gap-1 rounded-lg py-1 text-xs sm:min-h-[92px] sm:py-1.5 ${
                  isToday
                    ? "bg-accent/12 ring-1 ring-accent/40"
                    : dayActions.length > 0
                      ? "bg-panel-raised/60"
                      : ""
                }`}
              >
                <span className={`tabular-nums ${isToday ? "font-semibold text-accent" : "text-panel-fg/80"}`}>
                  {dayNum}
                </span>
                {dayActions.length > 0 && (
                  <span className="flex w-full flex-col items-stretch gap-0.5 px-0.5">
                    {dayActions.slice(0, MAX_BADGES_PER_DAY).map((action) => (
                      <Link
                        key={`${action.ticker}-${action.type}`}
                        href={`/stocks/${action.ticker}`}
                        className="type-badge truncate rounded px-1 py-[1px] text-center text-[8px] font-semibold leading-tight sm:text-[9px]"
                        style={{ "--badge-accent": CORPORATE_ACTION_TYPE_ACCENT[action.type] } as React.CSSProperties}
                      >
                        {action.ticker}
                      </Link>
                    ))}
                    {overflow > 0 && (
                      <span className="text-center text-[8px] font-medium text-panel-fg/50" aria-hidden="true">
                        +{overflow}
                      </span>
                    )}
                  </span>
                )}
                {summary && <span className="sr-only">{summary}</span>}
              </div>
            );
          })
        )}
      </div>

      {typesPresent.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-panel-border pt-3">
          {typesPresent.map((type) => (
            <span key={type} className="flex items-center gap-1.5 text-[11px] text-panel-fg/72">
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full"
                aria-hidden="true"
                style={{ backgroundColor: CORPORATE_ACTION_TYPE_ACCENT[type] }}
              />
              {CORPORATE_ACTION_LABELS[type]}
            </span>
          ))}
        </div>
      ) : (
        <p className="mt-4 border-t border-panel-border pt-3 text-xs text-panel-fg/60">
          No ex-dates on record this month.
        </p>
      )}
    </div>
  );
}
