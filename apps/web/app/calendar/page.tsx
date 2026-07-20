import type { Metadata } from "next";
import Link from "next/link";
import {
  CORPORATE_ACTION_LABELS,
  CORPORATE_ACTION_EXPLAINERS,
  CORPORATE_ACTION_TYPE_ACCENT,
  type CorporateAction,
} from "@pseye/source-corporate-actions";
import { getCorporateActions } from "@/lib/corporateActions";

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

export default async function CalendarPage() {
  const actions = await getCorporateActions();
  const sorted = [...actions].sort((a, b) => a.exDate.localeCompare(b.exDate));
  const todayIso = new Date().toISOString().slice(0, 10);
  const months = groupByMonth(sorted);

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">Dividend &amp; Corporate Actions Calendar</h1>
      <p className="mt-1.5 text-sm text-panel-fg/60">
        Ex-date, record date, and payment date for dividends, rights offers, and other
        corporate actions. Own the stock before the ex-date to be entitled.
      </p>

      <div className="mt-8 flex flex-col gap-8">
        {months.map(({ monthKey, actions }) => (
          <div key={monthKey}>
            <h2 className="text-xs font-semibold uppercase tracking-wide text-panel-fg/60">
              {formatMonthHeading(actions[0].exDate)}
            </h2>
            <ul className="mt-3 flex flex-col gap-3">
              {actions.map((action) => (
                <ActionRow
                  key={`${action.ticker}-${action.type}-${action.exDate}`}
                  action={action}
                  isPast={action.exDate < todayIso}
                  todayIso={todayIso}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>

      {sorted.length === 0 && (
        <p className="mt-8 rounded-lg bg-panel p-6 text-center text-sm text-panel-fg/50 ring-1 ring-panel-border">
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
      className={`overflow-hidden rounded-lg bg-panel ring-1 ring-panel-border ${isPast ? "opacity-50" : ""}`}
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
              className="rounded-full px-2 py-0.5 text-[10px] font-medium"
              style={{ backgroundColor: `${accent}1a`, color: accent }}
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

        <p className="mt-2 text-sm text-panel-fg">{action.details}</p>

        <div className="mt-2.5 grid grid-cols-3 gap-2 border-t border-panel-border pt-2.5 text-xs">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-panel-fg/60">Ex-date</div>
            <div className="mt-0.5 text-panel-fg/80">{formatDate(action.exDate)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-panel-fg/60">Record date</div>
            <div className="mt-0.5 text-panel-fg/80">{formatDate(action.recordDate)}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wide text-panel-fg/60">Payment date</div>
            <div className="mt-0.5 text-panel-fg/80">{action.paymentDate ? formatDate(action.paymentDate) : "—"}</div>
          </div>
        </div>

        <p className="mt-2.5 text-xs leading-snug text-panel-fg/60">{CORPORATE_ACTION_EXPLAINERS[action.type]}</p>
      </div>
    </li>
  );
}
