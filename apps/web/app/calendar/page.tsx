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
  title: "PSE Dividend Calendar — Ex-Date & Pay Dates",
  description: "Dividend and corporate actions calendar — ex-date, record date, and payment date.",
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

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8">
      <p className="kicker text-accent">Market Data</p>
      <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight sm:text-3xl">Dividend &amp; Corporate Actions Calendar</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-panel-fg/65">
        Ex-date, record date, and payment date for dividends, rights offers, and other
        corporate actions. Own the stock before the ex-date to be entitled.
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

      {upcomingMonths.length > 0 && (
        <div className="mt-8">
          <MonthGroup months={upcomingMonths} todayIso={todayIso} isPast={false} />
        </div>
      )}

      {upcoming.length === 0 && sorted.length > 0 && (
        <p className="mt-8 rounded-xl bg-panel p-6 text-center text-sm text-panel-fg/72 shadow-sm shadow-black/5 ring-1 ring-panel-border">
          No upcoming corporate actions on record. PSE Edge publishes these as companies declare
          them — past actions are listed below.
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
          No corporate actions on record for the current window.
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
            <div className="mt-0.5 text-panel-fg/80">{action.paymentDate ? formatDate(action.paymentDate) : "—"}</div>
          </div>
        </div>

        <p className="mt-2.5 text-xs leading-snug text-panel-fg/72">{CORPORATE_ACTION_EXPLAINERS[action.type]}</p>
      </div>
    </li>
  );
}
