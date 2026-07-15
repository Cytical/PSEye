import type { Metadata } from "next";
import {
  MockDisclosureSource,
  DISCLOSURE_TYPE_LABELS,
  type Disclosure,
} from "@pseye/source-disclosures";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Disclosures",
  description: "PSE Edge filings distilled into a per-company digest.",
};

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.round(diffMs / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
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
  const source = new MockDisclosureSource();
  const items = await source.getRecent();
  const groups = groupByCompany(items);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold">Insider Disclosure Digest</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        PSE Edge filings, grouped by company — who&apos;s filing what, without the raw
        real-time stream.
      </p>

      <div className="mt-6 flex flex-col gap-6">
        {groups.map((group) => (
          <div key={group.ticker}>
            <div className="flex items-center gap-2">
              <span className="rounded bg-black/5 px-1.5 py-0.5 font-mono text-[10px] dark:bg-white/10">
                {group.ticker}
              </span>
              <span className="font-medium">{group.companyName}</span>
            </div>
            <ul className="mt-2 flex flex-col gap-2 border-l border-black/10 pl-3 dark:border-white/10">
              {group.filings.map((f) => (
                <li key={f.referenceNo} className="text-sm">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="rounded-full border border-black/15 px-2 py-0.5 text-[10px] text-black/60 dark:border-white/15 dark:text-white/60">
                      {DISCLOSURE_TYPE_LABELS[f.type]}
                    </span>
                    <span className="text-[11px] text-black/40 dark:text-white/40">
                      {formatRelative(f.filedAt)}
                    </span>
                  </div>
                  <p className="mt-0.5">{f.headline}</p>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="mt-6 text-xs text-black/40 dark:text-white/40">
        Sample data — a real PSE Edge poller has not been wired in yet. Headlines here are
        illustrative, not actual filings.
      </p>
    </div>
  );
}
