import {
  MockCorporateActionSource,
  CORPORATE_ACTION_LABELS,
  CORPORATE_ACTION_EXPLAINERS,
  type CorporateAction,
} from "@pseye/source-corporate-actions";

export const revalidate = 86400;

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function CalendarPage() {
  const source = new MockCorporateActionSource();
  const actions = await source.getUpcoming();
  const sorted = [...actions].sort((a, b) => a.exDate.localeCompare(b.exDate));
  const todayIso = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold">Dividend &amp; Corporate Actions Calendar</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Ex-date, record date, and payment date for dividends, rights offers, and other
        corporate actions. Own the stock before the ex-date to be entitled.
      </p>

      <ul className="mt-6 flex flex-col gap-4">
        {sorted.map((action) => (
          <ActionRow key={`${action.ticker}-${action.type}-${action.exDate}`} action={action} isPast={action.exDate < todayIso} />
        ))}
      </ul>

      <p className="mt-6 text-xs text-black/40 dark:text-white/40">
        Sample data — a real PSE Edge disclosure parser has not been wired in yet. Dates and
        figures here are illustrative, not actual filings.
      </p>
    </div>
  );
}

function ActionRow({ action, isPast }: { action: CorporateAction; isPast: boolean }) {
  return (
    <li className={`border-b border-black/10 pb-4 dark:border-white/10 ${isPast ? "opacity-50" : ""}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded bg-black/5 px-1.5 py-0.5 font-mono text-[10px] dark:bg-white/10">
          {action.ticker}
        </span>
        <span className="font-medium">{action.companyName}</span>
        <span className="rounded-full border border-black/15 px-2 py-0.5 text-[10px] dark:border-white/15">
          {CORPORATE_ACTION_LABELS[action.type]}
        </span>
      </div>
      <p className="mt-1 text-sm">{action.details}</p>
      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-black/50 dark:text-white/50">
        <span>Ex-date: {formatDate(action.exDate)}</span>
        <span>Record date: {formatDate(action.recordDate)}</span>
        {action.paymentDate && <span>Payment date: {formatDate(action.paymentDate)}</span>}
      </div>
      <p className="mt-1 text-xs text-black/40 dark:text-white/40">
        {CORPORATE_ACTION_EXPLAINERS[action.type]}
      </p>
    </li>
  );
}
