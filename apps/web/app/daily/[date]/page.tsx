import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDailyRecap, type DailyRecap } from "@/lib/dailyRecap";
import { ShareButton } from "@/components/ShareButton";

export const revalidate = 3600; // late disclosures/news can still land on "today's" page

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function formatLongDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatShortDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatCompactPeso(n: number): string {
  const abs = Math.abs(n);
  if (abs >= 1e9) return `₱${(n / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `₱${(n / 1e6).toFixed(1)}M`;
  return `₱${Math.round(n).toLocaleString("en-PH")}`;
}

function formatManilaTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  });
}

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }): Promise<Metadata> {
  const { date } = await params;
  if (!DATE_RE.test(date)) return {};
  const title = `PSE Daily Recap — ${formatLongDate(date)}`;
  return {
    title,
    description: `What happened on the Philippine Stock Exchange on ${formatLongDate(date)}: PSEi close, top movers, foreign flow, block sales, and disclosures.`,
    alternates: { canonical: `/daily/${date}` },
    openGraph: { title },
  };
}

const UP = "#30cc5a";
const DOWN = "#f6362f";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg bg-panel p-4 ring-1 ring-panel-border">
      <h2 className="text-[11px] font-semibold uppercase tracking-wide text-panel-fg/50">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function MoverList({ movers }: { movers: DailyRecap["gainers"] }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {movers.map((m) => (
        <li key={m.ticker} className="flex items-baseline justify-between gap-3 text-sm">
          <Link href={`/stocks/${m.ticker}`} className="min-w-0 truncate hover:underline">
            <span className="font-mono text-xs font-semibold text-panel-fg">{m.ticker}</span>
            <span className="ml-2 text-panel-fg/60">{m.companyName}</span>
          </Link>
          <span
            className="shrink-0 font-medium tabular-nums"
            style={{ color: m.pctChange >= 0 ? UP : DOWN }}
          >
            {m.pctChange >= 0 ? "+" : ""}
            {m.pctChange.toFixed(2)}%
          </span>
        </li>
      ))}
    </ul>
  );
}

function FlowList({ rows }: { rows: DailyRecap["foreignBuys"] }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {rows.slice(0, 5).map((r) => (
        <li key={r.ticker} className="flex items-baseline justify-between gap-3 text-sm">
          <Link href={`/stocks/${r.ticker}`} className="min-w-0 truncate hover:underline">
            <span className="font-mono text-xs font-semibold text-panel-fg">{r.ticker}</span>
            <span className="ml-2 text-panel-fg/60">{r.companyName}</span>
          </Link>
          <span className="shrink-0 font-medium tabular-nums" style={{ color: r.netValue >= 0 ? UP : DOWN }}>
            {formatCompactPeso(r.netValue)}
          </span>
        </li>
      ))}
    </ul>
  );
}

export default async function DailyRecapPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!DATE_RE.test(date)) notFound();

  const recap = await getDailyRecap(date);
  if (!recap) notFound();

  const { snapshot, breadth } = recap;

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-panel-fg/50">Daily Recap</p>
          <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-panel-fg">
            {formatLongDate(recap.date)}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {recap.prevDate && (
            <Link
              href={`/daily/${recap.prevDate}`}
              className="rounded-md bg-panel px-3 py-1.5 text-sm text-panel-fg/70 ring-1 ring-panel-border transition-colors hover:bg-panel-raised hover:text-panel-fg"
            >
              ← {formatShortDate(recap.prevDate)}
            </Link>
          )}
          {recap.nextDate && (
            <Link
              href={`/daily/${recap.nextDate}`}
              className="rounded-md bg-panel px-3 py-1.5 text-sm text-panel-fg/70 ring-1 ring-panel-border transition-colors hover:bg-panel-raised hover:text-panel-fg"
            >
              {formatShortDate(recap.nextDate)} →
            </Link>
          )}
          <ShareButton
            shareTitle={`PSE Daily Recap — ${formatLongDate(recap.date)}`}
            shareText={
              snapshot
                ? `PSEi closed at ${snapshot.pseiValue.toLocaleString("en-PH", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })} (${snapshot.pseiPctChange >= 0 ? "+" : ""}${snapshot.pseiPctChange.toFixed(
                    2
                  )}%) — full PSE recap on PSEye`
                : `The full PSE market recap for ${formatLongDate(recap.date)} on PSEye`
            }
          />
        </div>
      </div>

      {(snapshot || breadth) && (
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {snapshot && (
            <>
              <div className="rounded-lg bg-panel p-4 ring-1 ring-panel-border">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-panel-fg/50">PSEi Close</p>
                <p className="mt-1 text-xl font-semibold tabular-nums text-panel-fg">
                  {snapshot.pseiValue.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
              <div className="rounded-lg bg-panel p-4 ring-1 ring-panel-border">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-panel-fg/50">Day Change</p>
                <p
                  className="mt-1 text-xl font-semibold tabular-nums"
                  style={{ color: snapshot.pseiPctChange >= 0 ? UP : DOWN }}
                >
                  {snapshot.pseiPctChange >= 0 ? "+" : ""}
                  {snapshot.pseiPctChange.toFixed(2)}%
                  <span className="ml-2 text-sm font-normal text-panel-fg/50">
                    {snapshot.pseiChange >= 0 ? "+" : ""}
                    {snapshot.pseiChange.toFixed(2)} pts
                  </span>
                </p>
              </div>
            </>
          )}
          {breadth && (
            <div className="rounded-lg bg-panel p-4 ring-1 ring-panel-border">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-panel-fg/50">Breadth</p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-panel-fg">
                <span style={{ color: UP }}>{breadth.advancers}▲</span>
                <span className="mx-1.5 text-panel-fg/30">/</span>
                <span style={{ color: DOWN }}>{breadth.decliners}▼</span>
                <span className="ml-2 text-sm font-normal text-panel-fg/50">
                  {breadth.unchanged} flat
                  {breadth.noTrade > 0 ? `, ${breadth.noTrade} no trade` : ""}
                </span>
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {recap.gainers.length > 0 && (
          <Section title="Top Gainers">
            <MoverList movers={recap.gainers} />
          </Section>
        )}
        {recap.losers.length > 0 && (
          <Section title="Top Losers">
            <MoverList movers={recap.losers} />
          </Section>
        )}
        {recap.foreignBuys.length > 0 && (
          <Section title="Top Net Foreign Buying">
            <FlowList rows={recap.foreignBuys} />
          </Section>
        )}
        {recap.foreignSells.length > 0 && (
          <Section title="Top Net Foreign Selling">
            <FlowList rows={recap.foreignSells} />
          </Section>
        )}
      </div>

      {recap.blockSales.length > 0 && (
        <div className="mt-3">
          <Section title={`Block Sales (${recap.blockSales.length})`}>
            <ul className="flex flex-col gap-1.5">
              {recap.blockSales.slice(0, 8).map((t, i) => (
                <li key={`${t.ticker}-${i}`} className="flex items-baseline justify-between gap-3 text-sm">
                  <Link href={`/stocks/${t.ticker}`} className="min-w-0 truncate hover:underline">
                    <span className="font-mono text-xs font-semibold text-panel-fg">{t.ticker}</span>
                    <span className="ml-2 text-panel-fg/60">
                      {t.volume.toLocaleString("en-PH")} sh @ ₱{t.price.toFixed(2)}
                    </span>
                  </Link>
                  <span className="shrink-0 font-medium tabular-nums text-panel-fg">{formatCompactPeso(t.value)}</span>
                </li>
              ))}
            </ul>
            {recap.blockSales.length > 8 && (
              <p className="mt-2 text-xs text-panel-fg/50">
                <Link href="/block-sales" className="hover:underline">
                  All recent block sales →
                </Link>
              </p>
            )}
          </Section>
        </div>
      )}

      {recap.disclosures.length > 0 && (
        <div className="mt-3">
          <Section title={`Disclosures Filed (${recap.disclosures.length})`}>
            <ul className="flex flex-col gap-2">
              {recap.disclosures.slice(0, 12).map((d, i) => (
                <li key={i} className="flex items-baseline gap-3 text-sm">
                  <span className="shrink-0 text-xs tabular-nums text-panel-fg/40">{formatManilaTime(d.filedAt)}</span>
                  <Link href={`/stocks/${d.ticker}`} className="shrink-0 font-mono text-xs font-semibold text-panel-fg hover:underline">
                    {d.ticker}
                  </Link>
                  {d.url ? (
                    <a
                      href={d.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 truncate text-panel-fg/80 hover:underline"
                    >
                      {d.headline}
                    </a>
                  ) : (
                    <span className="min-w-0 truncate text-panel-fg/80">{d.headline}</span>
                  )}
                </li>
              ))}
            </ul>
            {recap.disclosures.length > 12 && (
              <p className="mt-2 text-xs text-panel-fg/50">
                <Link href="/disclosures" className="hover:underline">
                  All disclosures →
                </Link>
              </p>
            )}
          </Section>
        </div>
      )}

      {recap.news.length > 0 && (
        <div className="mt-3">
          <Section title="In the News">
            <ul className="flex flex-col gap-2">
              {recap.news.map((n) => (
                <li key={n.url} className="text-sm">
                  <a href={n.url} target="_blank" rel="noopener noreferrer" className="text-panel-fg/80 hover:underline">
                    {n.title}
                  </a>
                  <span className="ml-2 text-xs text-panel-fg/40">{n.source}</span>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      )}

      <p className="mt-6 text-xs text-panel-fg/50">
        Generated from data recorded by PSEye&apos;s own pipeline on this date — sections without
        recorded data are omitted rather than estimated.
      </p>
    </div>
  );
}
