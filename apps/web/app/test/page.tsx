import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDailyQuotes } from "@/lib/quotes";
import { NASDAQ_100_STOCKS } from "@/lib/nasdaq100";
import { validateStocks } from "@/lib/dataValidation";
import { comparePhQuotes } from "@/lib/phDataComparison";
import { ValidationReportCard } from "@/components/ValidationReportCard";
import { PhComparisonTable } from "@/components/PhComparisonTable";
import { getWorkflowRuns } from "@/lib/workflowRuns";
import { WorkflowRunsCard } from "@/components/WorkflowRunsCard";

export const revalidate = 0;

export const metadata: Metadata = {
  title: "Data Validation",
  robots: { index: false, follow: false },
};

/**
 * Dev-only dashboard (linked from the Dev Tools indicator, hidden in
 * production). Shows live data-validation results for the PH quote API
 * (DB-backed getDailyQuotes(), same data the market map renders) and the
 * US/Nasdaq 100 mock dataset, plus an opt-in line-by-line comparison of PH
 * quotes against a fresh PSE Edge re-scrape. Unit test results are a planned
 * addition here, not yet wired up.
 *
 * "Hidden in production" used to describe only DevToolsLink, which is the
 * button — the route itself was reachable by URL on the deployed site, and
 * `robots: noindex` keeps it out of search results but is not access control.
 * That mattered because `?compare=1` re-scrapes *every* ticker in the roster
 * (282 outbound requests to edge.pse.com.ph per hit, by the page's own
 * description below) on an uncached route. Anyone hitting it in a loop could
 * get the site's egress IPs throttled or blocked by PSE Edge — taking down the
 * ETL that every page depends on, not just this one. It also spends the
 * unauthenticated GitHub API budget via getWorkflowRuns on each load.
 *
 * Production access is therefore closed unless DEV_DASHBOARD_SECRET is set and
 * matched by `?secret=`, mirroring app/api/revalidate/route.ts's gate. With no
 * env var configured the route simply 404s in production, which is what the
 * comment above always claimed.
 */
export default async function TestPage({
  searchParams,
}: {
  searchParams: Promise<{ compare?: string; secret?: string }>;
}) {
  const { compare, secret } = await searchParams;

  if (process.env.NODE_ENV === "production") {
    const expected = process.env.DEV_DASHBOARD_SECRET;
    if (!expected || secret !== expected) notFound();
  }

  const runComparison = compare === "1";

  const [phQuotes, workflowRuns] = await Promise.all([getDailyQuotes(), getWorkflowRuns()]);
  const phReport = validateStocks(phQuotes);
  const usReport = validateStocks(NASDAQ_100_STOCKS);
  const comparison = runComparison ? await comparePhQuotes() : null;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-xl font-semibold">Data Validation</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Live structural + business-rule checks over what the API actually returns right now, not
        against fixtures. Not linked from the public nav.
      </p>

      <div className="mt-6 space-y-6">
        <WorkflowRunsCard data={workflowRuns} />
        <ValidationReportCard title="PH stocks (PSE, getDailyQuotes())" report={phReport} />
        <ValidationReportCard title="US stocks (Nasdaq 100 mock dataset)" report={usReport} />

        <section className="rounded-lg border border-black/10 p-4 dark:border-white/10">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">PH stocks — DB vs. live PSE Edge</h2>
            {!runComparison && (
              <Link
                // Carries ?secret= through so the gated production flow still
                // works in one click when DEV_DASHBOARD_SECRET is configured.
                href={secret ? `/test?compare=1&secret=${encodeURIComponent(secret)}` : "/test?compare=1"}
                className="rounded-full border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/10"
              >
                Run live comparison
              </Link>
            )}
          </div>
          <p className="mt-1 text-xs text-black/50 dark:text-white/50">
            Re-fetches every tracked ticker from PSE Edge on demand (~97 requests, ~20s) and diffs
            it against what&apos;s stored in the DB. Verifies the ETL write path and staleness —
            price/% drift is expected if the market has moved since the last ETL run. An N/A
            mismatch (one side reports a trade, the other doesn&apos;t) or a % N/A mismatch (price
            matches, but one side has no % change value at all) is the signal worth investigating —
            the latter means that ticker&apos;s stored % change is stuck at N/A even though a real
            value exists, usually from a scrape hiccup on a prior ETL run that a later run hasn&apos;t
            overwritten yet.
          </p>
          {comparison && (
            <div className="mt-4">
              <PhComparisonTable result={comparison} />
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
