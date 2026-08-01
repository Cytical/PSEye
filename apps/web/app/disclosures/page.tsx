import type { Metadata } from "next";
import Link from "next/link";
import { DISCLOSURE_TYPE_LABELS, DISCLOSURE_TYPE_ACCENT, type Disclosure } from "@pseye/source-disclosures";
import { getDisclosures } from "@/lib/disclosures";

export const revalidate = 21600; // 6h safety-net ceiling; real refresh is on-demand via revalidateTag/revalidatePath from the ETL jobs (see app/api/revalidate/route.ts) — the wall-clock value only kicks in if that call ever fails.

export const metadata: Metadata = {
  title: "PSE Disclosures: Filings Digest",
  description: "PSE filings distilled into a per-company digest.",
  alternates: { canonical: "/disclosures" },
};

const RECENT_HOURS = 24;

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.round(diffMs / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function isRecent(iso: string): boolean {
  return Date.now() - new Date(iso).getTime() < RECENT_HOURS * 3_600_000;
}

function groupByCompany(items: Disclosure[]): { ticker: string; companyName: string; filings: Disclosure[] }[] {
  const groups = new Map<string, { ticker: string; companyName: string; filings: Disclosure[] }>();
  for (const item of items) {
    if (!groups.has(item.ticker)) {
      groups.set(item.ticker, { ticker: item.ticker, companyName: item.companyName, filings: [] });
    }
    groups.get(item.ticker)!.filings.push(item);
  }
  return [...groups.values()].sort(
    (a, b) => b.filings[0].filedAt.localeCompare(a.filings[0].filedAt)
  );
}

export default async function DisclosuresPage() {
  const items = await getDisclosures();
  const groups = groupByCompany(items);

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8">
      <p className="kicker text-accent">Market Data</p>
      <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight sm:text-3xl">Insider Disclosure Digest</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-panel-fg/65">
        PSE filings, grouped by company. Who&apos;s filing what, without the raw real-time
        stream.
      </p>

      <div className="mt-8 flex flex-col gap-3">
        {groups.map((group) => {
          const hasRecent = group.filings.some((f) => isRecent(f.filedAt));
          return (
          <details key={group.ticker} className="group overflow-hidden rounded-xl bg-panel shadow-sm shadow-black/5 ring-1 ring-panel-border">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 marker:content-none hover:bg-panel-raised/60">
              <span className="flex items-center gap-2">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="shrink-0 text-panel-fg/50 transition-transform group-open:rotate-90"
                  aria-hidden="true"
                >
                  <polyline points="9 6 15 12 9 18" />
                </svg>
                <span className="rounded bg-panel-raised px-1.5 py-0.5 font-mono text-[10px] text-panel-fg/80">
                  {group.ticker}
                </span>
                <span className="font-medium text-panel-fg">{group.companyName}</span>
                {hasRecent && (
                  <span className="flex items-center gap-1 text-[10px] font-medium text-panel-fg/68">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-up" />
                    New
                  </span>
                )}
              </span>
              <span className="shrink-0 text-[11px] text-panel-fg/72">
                {group.filings.length} filing{group.filings.length === 1 ? "" : "s"}
              </span>
            </summary>
            <div className="border-t border-panel-border px-4 py-2">
              <Link href={`/stocks/${group.ticker}`} className="text-[11px] text-panel-fg/72 hover:text-panel-fg hover:underline">
                View company page →
              </Link>
            </div>
            <ul className="flex flex-col divide-y divide-panel-border border-t border-panel-border">
              {group.filings.map((f) => {
                const accent = DISCLOSURE_TYPE_ACCENT[f.type];
                const recent = isRecent(f.filedAt);
                return (
                  <li key={f.referenceNo} className="px-4 py-3 text-sm" style={{ borderLeft: `3px solid ${accent}` }}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="type-badge rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{ "--badge-accent": accent } as React.CSSProperties}
                      >
                        {DISCLOSURE_TYPE_LABELS[f.type]}
                      </span>
                      {recent && (
                        <span className="flex items-center gap-1 text-[10px] font-medium text-panel-fg/68">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-up" />
                          New
                        </span>
                      )}
                      <span className="ml-auto text-[11px] text-panel-fg/72">{formatRelative(f.filedAt)}</span>
                    </div>
                    {f.url ? (
                      <a
                        href={f.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block text-panel-fg hover:underline"
                      >
                        {f.headline} <span aria-hidden="true">↗</span>
                      </a>
                    ) : (
                      <p className="mt-1 text-panel-fg">{f.headline}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          </details>
          );
        })}
      </div>

      {groups.length === 0 && (
        <p className="mt-8 rounded-xl bg-panel p-6 text-center text-sm text-panel-fg/72 shadow-sm shadow-black/5 ring-1 ring-panel-border">
          No disclosures on record yet for the last lookback window.
        </p>
      )}
    </div>
  );
}
