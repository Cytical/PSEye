import type { Metadata } from "next";
import Link from "next/link";
import { DISCLOSURE_TYPE_LABELS, DISCLOSURE_TYPE_ACCENT, type Disclosure } from "@pseye/source-disclosures";
import { getDisclosures } from "@/lib/disclosures";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Disclosures",
  description: "PSE Edge filings distilled into a per-company digest.",
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
      <h1 className="text-2xl font-semibold tracking-tight">Insider Disclosure Digest</h1>
      <p className="mt-1.5 text-sm text-panel-fg/60">
        PSE Edge filings, grouped by company — who&apos;s filing what, without the raw
        real-time stream.
      </p>

      <div className="mt-8 flex flex-col gap-4">
        {groups.map((group) => (
          <div key={group.ticker} className="overflow-hidden rounded-lg bg-panel ring-1 ring-panel-border">
            <div className="flex items-center justify-between gap-2 border-b border-panel-border px-4 py-3">
              <Link href={`/stocks/${group.ticker}`} className="flex items-center gap-2 hover:underline">
                <span className="rounded bg-panel-raised px-1.5 py-0.5 font-mono text-[10px] text-panel-fg/80">
                  {group.ticker}
                </span>
                <span className="font-medium text-panel-fg">{group.companyName}</span>
              </Link>
              <span className="shrink-0 text-[11px] text-panel-fg/60">
                {group.filings.length} filing{group.filings.length === 1 ? "" : "s"}
              </span>
            </div>
            <ul className="flex flex-col divide-y divide-panel-border">
              {group.filings.map((f) => {
                const accent = DISCLOSURE_TYPE_ACCENT[f.type];
                const recent = isRecent(f.filedAt);
                return (
                  <li key={f.referenceNo} className="px-4 py-3 text-sm" style={{ borderLeft: `3px solid ${accent}` }}>
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{ backgroundColor: `${accent}1a`, color: accent }}
                      >
                        {DISCLOSURE_TYPE_LABELS[f.type]}
                      </span>
                      {recent && (
                        <span className="flex items-center gap-1 text-[10px] font-medium text-panel-fg/50">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#2f8f4e]" />
                          New
                        </span>
                      )}
                      <span className="ml-auto text-[11px] text-panel-fg/60">{formatRelative(f.filedAt)}</span>
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
          </div>
        ))}
      </div>

      {groups.length === 0 && (
        <p className="mt-8 rounded-lg bg-panel p-6 text-center text-sm text-panel-fg/50 ring-1 ring-panel-border">
          No disclosures on record yet for the last lookback window.
        </p>
      )}
    </div>
  );
}
