import type { Metadata } from "next";
import Link from "next/link";
import { getRecentRecapIndex, type RecapIndexEntry } from "@/lib/dailyRecap";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "PSE Market Recap — PSEi Today's Movers & Flow",
  description: "One page per PSE trading day: index move, top movers, foreign flow, block sales, and disclosures.",
  alternates: { canonical: "/daily" },
};

const UP = "var(--up)";
const DOWN = "var(--down)";

function formatLongDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatDayLabel(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-PH", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatMonthLabel(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-PH", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatIndex(n: number): string {
  return n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}

/** Consecutive runs of days sharing a month, preserving the newest-first order. */
function groupByMonth(days: RecapIndexEntry[]): { month: string; days: RecapIndexEntry[] }[] {
  const groups: { month: string; days: RecapIndexEntry[] }[] = [];
  for (const day of days) {
    const month = formatMonthLabel(day.date);
    const current = groups[groups.length - 1];
    if (current && current.month === month) current.days.push(day);
    else groups.push({ month, days: [day] });
  }
  return groups;
}

function DayRow({ day }: { day: RecapIndexEntry }) {
  const color = day.pseiPctChange >= 0 ? UP : DOWN;
  return (
    <li>
      <Link
        href={`/daily/${day.date}`}
        className="flex items-baseline justify-between gap-3 rounded-lg px-3 py-2 transition-colors hover:bg-panel-raised"
      >
        <span className="min-w-0 truncate text-sm text-panel-fg/80">{formatDayLabel(day.date)}</span>
        <span className="flex shrink-0 items-baseline gap-3 tabular-nums">
          <span className="text-sm text-panel-fg/72">{formatIndex(day.pseiValue)}</span>
          <span className="w-16 text-right text-sm font-medium" style={{ color }}>
            {formatPct(day.pseiPctChange)}
          </span>
        </span>
      </Link>
    </li>
  );
}

export default async function DailyIndexPage() {
  const days = await getRecentRecapIndex(60);
  const [latest, ...earlier] = days;

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8">
      <p className="kicker text-accent">Daily Recap</p>
      <h1 className="mt-0.5 font-serif text-2xl font-semibold tracking-tight text-panel-fg sm:text-3xl">
        PSE Market Recap Archive
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-panel-fg/72">
        One page per Philippine Stock Exchange trading day — the PSEi close, market breadth, top gainers
        and losers, net foreign flow, block sales, and the disclosures filed that session.
      </p>

      {!latest ? (
        <p className="mt-10 text-sm text-panel-fg/72">
          No trading days are on record yet — recaps are generated from real recorded market data, so
          they&apos;ll start appearing once the data pipeline has captured its first session.
        </p>
      ) : (
        <>
          <Link
            href={`/daily/${latest.date}`}
            className="mt-6 block rounded-xl bg-panel p-5 shadow-sm shadow-black/5 ring-1 ring-panel-border transition-colors hover:bg-panel-raised"
          >
            <span className="kicker text-panel-fg/60">Latest session</span>
            <span className="mt-1 block font-serif text-xl font-semibold tracking-tight text-panel-fg sm:text-2xl">
              {formatLongDate(latest.date)}
            </span>
            <span className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1 tabular-nums">
              <span className="text-2xl font-semibold text-panel-fg">{formatIndex(latest.pseiValue)}</span>
              <span
                className="text-sm font-medium"
                style={{ color: latest.pseiPctChange >= 0 ? UP : DOWN }}
              >
                {latest.pseiChange >= 0 ? "+" : ""}
                {formatIndex(latest.pseiChange)} ({formatPct(latest.pseiPctChange)})
              </span>
            </span>
          </Link>

          {earlier.length > 0 && (
            <div className="mt-8">
              <h2 className="font-serif text-lg font-semibold tracking-tight text-panel-fg">
                Previous sessions
              </h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {groupByMonth(earlier).map((group) => (
                  <section
                    key={group.month}
                    className="rounded-xl bg-panel p-3 shadow-sm shadow-black/5 ring-1 ring-panel-border"
                  >
                    <h3 className="px-3 pb-1 pt-1 text-[11px] font-semibold uppercase tracking-wide text-panel-fg/60">
                      {group.month}
                    </h3>
                    <ul className="flex flex-col">
                      {group.days.map((day) => (
                        <DayRow key={day.date} day={day} />
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
