import type { Metadata } from "next";
import Link from "next/link";
import {
  CORPORATE_ACTION_LABELS,
  CORPORATE_ACTION_EXPLAINERS,
  CORPORATE_ACTION_TYPE_ACCENT,
  type CorporateAction,
} from "@pseye/source-corporate-actions";
import { getCorporateActions } from "@/lib/corporateActions";
import { formatCorporateActionRate } from "@/lib/corporateActionRate";
import { manilaToday } from "@/lib/manilaDate";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "PSE Dividend Calendar: Ex-Date & Pay Dates",
  description: "Dividend and corporate actions calendar: ex-date, record date, and payment date.",
  alternates: { canonical: "/calendar" },
};

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatMonthHeading(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-PH", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function daysUntil(iso: string, todayIso: string): number {
  const a = new Date(todayIso + "T00:00:00Z").getTime();
  const b = new Date(iso + "T00:00:00Z").getTime();
  return Math.round((b - a) / 86_400_000);
}

function countdownLabel(days: number): string {
  if (days === 0) return "Today";
  if (days < 0) return `${Math.abs(days)}d ago`;
  return `In ${days}d`;
}

function groupByMonth(actions: CorporateAction[]): { monthKey: string; actions: CorporateAction[] }[] {
  const groups = new Map<string, CorporateAction[]>();
  for (const action of actions) {
    const monthKey = action.exDate.slice(0, 7); // YYYY-MM
    if (!groups.has(monthKey)) groups.set(monthKey, []);
    groups.get(monthKey)!.push(action);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([monthKey, actions]) => ({ monthKey, actions }));
}

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

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

/** The calendar grid shows one month. Today's month if it has any ex-dates on
 * record; otherwise the nearest upcoming month that does, so a visitor
 * landing between two dividend seasons doesn't just see an empty grid — same
 * "lead with what's actionable" reasoning as `upcoming`/`past` below. Falls
 * back to today's own (empty) month only when nothing on file is upcoming. */
function pickCalendarMonth(
  allMonths: { monthKey: string; actions: CorporateAction[] }[],
  todayIso: string
): { monthKey: string; actions: CorporateAction[] } {
  const currentMonthKey = todayIso.slice(0, 7);
  const current = allMonths.find((m) => m.monthKey === currentMonthKey);
  if (current) return current;
  const next = allMonths.find((m) => m.monthKey > currentMonthKey);
  if (next) return next;
  return { monthKey: currentMonthKey, actions: [] };
}

/** At-a-glance month grid, rendered above the itemized list below it. Static
 * — no navigation/interactivity — so this stays a plain server component
 * like the rest of the page; a visitor wanting other months already has the
 * full list underneath. */
function MonthCalendar({
  monthKey,
  actions,
  todayIso,
}: {
  monthKey: string;
  actions: CorporateAction[];
  todayIso: string;
}) {
  const weeks = buildCalendarWeeks(monthKey);
  const byDay = new Map<string, CorporateAction[]>();
  for (const action of actions) {
    if (!byDay.has(action.exDate)) byDay.set(action.exDate, []);
    byDay.get(action.exDate)!.push(action);
  }
  const typesPresent = [...new Set(actions.map((a) => a.type))];

  return (
    <div className="rounded-xl bg-panel p-4 shadow-sm shadow-black/5 ring-1 ring-panel-border sm:p-5">
      <h2 className="kicker text-panel-fg/72">{formatMonthHeading(`${monthKey}-01`)} at a glance</h2>

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

            return (
              <div
                key={dayIso}
                title={summary ?? undefined}
                className={`flex min-h-[44px] flex-col items-center gap-1 rounded-lg py-1 text-xs sm:min-h-[56px] sm:py-1.5 ${
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
                  <span className="flex flex-wrap items-center justify-center gap-0.5 px-0.5" aria-hidden="true">
                    {dayActions.slice(0, 4).map((action) => (
                      <span
                        key={`${action.ticker}-${action.type}`}
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: CORPORATE_ACTION_TYPE_ACCENT[action.type] }}
                      />
                    ))}
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

function MonthGroup({
  months,
  todayIso,
  isPast,
}: {
  months: { monthKey: string; actions: CorporateAction[] }[];
  todayIso: string;
  isPast: boolean;
}) {
  return (
    <div className="flex flex-col gap-8">
      {months.map(({ monthKey, actions }) => (
        <div key={monthKey}>
          <h3 className="kicker text-panel-fg/72">{formatMonthHeading(actions[0].exDate)}</h3>
          <ul className="mt-3 flex flex-col gap-3">
            {actions.map((action) => (
              <ActionRow
                key={`${action.ticker}-${action.type}-${action.exDate}`}
                action={action}
                isPast={isPast}
                todayIso={todayIso}
              />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

export default async function CalendarPage() {
  const actions = await getCorporateActions();
  const sorted = [...actions].sort((a, b) => a.exDate.localeCompare(b.exDate));
  const todayIso = manilaToday();

  // The page used to render one flat ascending list, which meant it opened on
  // whatever the oldest row on file was — months-dead ex-dates the visitor
  // can no longer act on — with the actually-actionable upcoming dates pushed
  // below the fold. Everything a dividend calendar is for is in the future, so
  // upcoming leads and past is collapsed behind a <details> underneath.
  const upcoming = sorted.filter((a) => a.exDate >= todayIso);
  const past = sorted.filter((a) => a.exDate < todayIso);
  const upcomingMonths = groupByMonth(upcoming);
  // Most-recent-first: when you do go looking through past actions, the one
  // that just happened is far likelier to be the one you want.
  const pastMonths = groupByMonth(past).reverse();
  const nextUp = upcoming[0];
  const allMonths = groupByMonth(sorted);
  const calendarMonth = pickCalendarMonth(allMonths, todayIso);

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8">
      <p className="kicker text-accent">Market Data</p>
      <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight sm:text-3xl">Dividend &amp; Corporate Actions Calendar</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-panel-fg/65">
        Ex-date, record date, and payment date for dividends, rights offers, and other
        corporate actions. Own the stock before the ex-date to qualify.
      </p>

      {nextUp && (
        <p className="mt-4 text-sm text-panel-fg/72">
          <span className="font-semibold text-panel-fg">{upcoming.length}</span> upcoming
          {" · next ex-date "}
          <Link href={`/stocks/${nextUp.ticker}`} className="font-semibold text-accent hover:underline">
            {nextUp.ticker}
          </Link>{" "}
          {countdownLabel(daysUntil(nextUp.exDate, todayIso)).toLowerCase()}
        </p>
      )}

      {sorted.length > 0 && (
        <div className="mt-8">
          <MonthCalendar monthKey={calendarMonth.monthKey} actions={calendarMonth.actions} todayIso={todayIso} />
        </div>
      )}

      {upcomingMonths.length > 0 && (
        <div className="mt-8">
          <MonthGroup months={upcomingMonths} todayIso={todayIso} isPast={false} />
        </div>
      )}

      {upcoming.length === 0 && sorted.length > 0 && (
        <p className="mt-8 rounded-xl bg-panel p-6 text-center text-sm text-panel-fg/72 shadow-sm shadow-black/5 ring-1 ring-panel-border">
          No upcoming corporate actions on record. PSE Edge publishes these as companies declare
          them; see past actions below.
        </p>
      )}

      {pastMonths.length > 0 && (
        <details className="mt-10 border-t border-panel-border pt-6">
          <summary className="kicker text-panel-fg/72 hover:text-panel-fg">
            Past actions ({past.length})
          </summary>
          <div className="mt-5">
            <MonthGroup months={pastMonths} todayIso={todayIso} isPast />
          </div>
        </details>
      )}

      {sorted.length === 0 && (
        <p className="mt-8 rounded-xl bg-panel p-6 text-center text-sm text-panel-fg/72 shadow-sm shadow-black/5 ring-1 ring-panel-border">
          No corporate actions on record for this period.
        </p>
      )}
    </div>
  );
}

function ActionRow({ action, isPast, todayIso }: { action: CorporateAction; isPast: boolean; todayIso: string }) {
  const accent = CORPORATE_ACTION_TYPE_ACCENT[action.type];
  const days = daysUntil(action.exDate, todayIso);

  return (
    <li
      // Past rows used to carry `opacity-50`, which halved the contrast of
      // every string inside them — a card whose body text sat at ~2:1. They no
      // longer need to shout for attention from inside the collapsed "Past"
      // section, so the de-emphasis moves to the surface (a recessed
      // background) and leaves the text itself at full, legible contrast.
      className={`overflow-hidden rounded-xl shadow-sm shadow-black/5 ring-1 ring-panel-border ${
        isPast ? "bg-panel-raised/60" : "bg-panel"
      }`}
      style={{ borderLeft: `3px solid ${accent}` }}
    >
      <div className="p-4">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <Link href={`/stocks/${action.ticker}`} className="flex items-center gap-2 hover:underline">
              <span className="rounded bg-panel-raised px-1.5 py-0.5 font-mono text-[10px] text-panel-fg/80">
                {action.ticker}
              </span>
              <span className="font-medium text-panel-fg">{action.companyName}</span>
            </Link>
            <span
              className="type-badge rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{ "--badge-accent": accent } as React.CSSProperties}
            >
              {CORPORATE_ACTION_LABELS[action.type]}
            </span>
          </div>
          {!isPast && (
            <span className="shrink-0 rounded-full bg-panel-raised px-2 py-0.5 text-[10px] font-medium tabular-nums text-panel-fg/70">
              {countdownLabel(days)}
            </span>
          )}
        </div>

        <p className="mt-2 text-sm font-medium tabular-nums text-panel-fg">
          {formatCorporateActionRate(action.details)}
        </p>

        <div className="mt-2.5 grid grid-cols-3 gap-2 border-t border-panel-border pt-2.5 text-xs">
          <div>
            <div className="kicker text-panel-fg/72">Ex-date</div>
            <div className="mt-0.5 text-panel-fg/80">{formatDate(action.exDate)}</div>
          </div>
          <div>
            <div className="kicker text-panel-fg/72">Record date</div>
            <div className="mt-0.5 text-panel-fg/80">{formatDate(action.recordDate)}</div>
          </div>
          <div>
            <div className="kicker text-panel-fg/72">Payment date</div>
            <div className="mt-0.5 text-panel-fg/80">{action.paymentDate ? formatDate(action.paymentDate) : "N/A"}</div>
          </div>
        </div>

        <p className="mt-2.5 text-xs leading-snug text-panel-fg/72">{CORPORATE_ACTION_EXPLAINERS[action.type]}</p>
      </div>
    </li>
  );
}
