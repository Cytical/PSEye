import type { Metadata } from "next";
import Link from "next/link";
import { getScreener } from "@/lib/screener";
import { ScreenerTable } from "@/components/ScreenerTable";

export const revalidate = 21600; // 6h safety-net ceiling; real refresh is on-demand via revalidateTag/revalidatePath from the ETL jobs (see app/api/revalidate/route.ts) — the wall-clock value only kicks in if that call ever fails.

export const metadata: Metadata = {
  title: "PSE Explorer: Filter & Sort Philippine Stocks",
  description:
    "Screen every tracked Philippine Stock Exchange (PSE) company by price, daily change, market cap, dividend yield, P/E, P/B, and sector. Free, no login required.",
  alternates: { canonical: "/screener" },
};

export default async function ScreenerPage() {
  const rows = await getScreener();

  // Valuation coverage is genuinely partial: company_financials is populated by
  // a manual backfill, and a ratio is also withheld for loss-making companies
  // and foreign-currency filers. Same "say what you don't have" footnote shape
  // as /dividends rather than letting a wall of N/A speak for itself.
  const withValuation = rows.filter((r) => r.peRatio != null || r.pbRatio != null).length;

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8">
      <p className="kicker text-accent">Tools</p>
      <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-panel-fg sm:text-3xl">Explorer</h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-panel-fg/65">
        Every tracked PSE company in one sortable table: price, today&apos;s change, market cap
        (raw and PSE-adjusted), trailing 12-month dividend yield, and the{" "}
        <Link href="/glossary/pe-ratio" className="underline hover:text-panel-fg">
          P/E
        </Link>{" "}
        and{" "}
        <Link href="/glossary/pb-ratio" className="underline hover:text-panel-fg">
          P/B
        </Link>{" "}
        valuation multiples. Sorted by market cap, like the{" "}
        <Link href="/rankings" className="underline hover:text-panel-fg">
          rankings
        </Link>{" "}
        (Manulife and Sun Life are the only two names where that column differs from raw cap; see
        the rankings page for why). Search, filter by sector, or star stocks to your watchlist. For
        ex-dates and
        payout history, see the{" "}
        <Link href="/dividends" className="underline hover:text-panel-fg">
          dividend screener
        </Link>
        . Prices are end-of-day or delayed.
      </p>

      <div className="mt-8">
        <ScreenerTable rows={rows} />
      </div>

      <div className="mt-6 flex flex-col gap-1.5 text-xs text-panel-fg/72">
        <p>
          P/E and P/B are available for {withValuation} of {rows.length} tracked companies. They are
          derived from each company&apos;s latest annual filing on PSE Edge, so the fiscal year
          differs from row to row (the exact year is shown on each{" "}
          <Link href="/stocks" className="underline hover:text-panel-fg">
            company page
          </Link>
          ). A company that has not filed one, that reported a loss, or that reports in a foreign
          currency shows N/A rather than an estimate.
        </p>
      </div>
    </div>
  );
}
