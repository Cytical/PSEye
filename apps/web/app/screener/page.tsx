import type { Metadata } from "next";
import Link from "next/link";
import { getScreener } from "@/lib/screener";
import { ScreenerTable } from "@/components/ScreenerTable";

export const revalidate = 21600; // 6h safety-net ceiling; real refresh is on-demand via revalidateTag/revalidatePath from the ETL jobs (see app/api/revalidate/route.ts) — the wall-clock value only kicks in if that call ever fails.

export const metadata: Metadata = {
  title: "PSE Explorer: Filter & Sort Philippine Stocks",
  description:
    "Screen every tracked Philippine Stock Exchange (PSE) company by price, daily change, market cap, free-float-adjusted market cap, dividend yield, and sector. Free, no login required.",
  alternates: { canonical: "/screener" },
};

export default async function ScreenerPage() {
  const rows = await getScreener();

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8">
      <p className="kicker text-accent">Tools</p>
      <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-panel-fg sm:text-3xl">Explorer</h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-panel-fg/65">
        Every tracked PSE company in one sortable table: price, today&apos;s change, market cap
        (raw and float-adjusted), and trailing 12-month dividend yield. Sorted by float-adjusted
        cap, like the{" "}
        <Link href="/rankings" className="underline hover:text-panel-fg">
          rankings
        </Link>
        , since that&apos;s what the PSEi actually weights by. The raw column still sorts if you
        want it. Search, filter by sector, or star stocks to your watchlist. For ex-dates and
        payout history, see the{" "}
        <Link href="/dividends" className="underline hover:text-panel-fg">
          dividend screener
        </Link>
        . Prices are end-of-day or delayed.
      </p>

      <div className="mt-8">
        <ScreenerTable rows={rows} />
      </div>
    </div>
  );
}
