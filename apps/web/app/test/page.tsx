import type { Metadata } from "next";
import Link from "next/link";
import { getDailyQuotes } from "@/lib/quotes";
import { NASDAQ_100_STOCKS } from "@/lib/nasdaq100";
import { validateStocks } from "@/lib/dataValidation";
import { comparePhQuotes } from "@/lib/phDataComparison";
import { ValidationReportCard } from "@/components/ValidationReportCard";
import { PhComparisonTable } from "@/components/PhComparisonTable";

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
 */
export default async function TestPage({
  searchParams,
}: {
  searchParams: Promise<{ compare?: string }>;
}) {
  const { compare } = await searchParams;
  const runComparison = compare === "1";

  const phQuotes = await getDailyQuotes();
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
        <ValidationReportCard title="PH stocks (PSE, getDailyQuotes())" report={phReport} />
        <ValidationReportCard title="US stocks (Nasdaq 100 mock dataset)" report={usReport} />

        <section className="rounded-lg border border-black/10 p-4 dark:border-white/10">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">PH stocks — DB vs. live PSE Edge</h2>
            {!runComparison && (
              <Link
                href="/test?compare=1"
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
