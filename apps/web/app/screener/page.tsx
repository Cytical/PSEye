import type { Metadata } from "next";
import Link from "next/link";
import { getScreener } from "@/lib/screener";
import { ScreenerTable } from "@/components/ScreenerTable";

export const revalidate = 3600; // matches quotes' hourly ETL cadence — same window as the market map

export const metadata: Metadata = {
  title: "PSE Stock Screener — Filter & Sort Philippine Stocks",
  description:
    "Screen every tracked Philippine Stock Exchange (PSE) company by price, daily change, market cap, free-float-adjusted market cap, dividend yield, and sector. Free, no login — sort and filter the whole board.",
  alternates: { canonical: "/screener" },
};

export default async function ScreenerPage() {
  const rows = await getScreener();

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8">
      <p className="kicker text-accent">Tools</p>
      <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-panel-fg sm:text-3xl">Stock Screener</h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-panel-fg/65">
        Every tracked PSE-listed company in one sortable table — price, today&apos;s change, market
        capitalization both raw and free-float-adjusted, and trailing-12-month dividend yield.
        Sorted by float-adjusted cap to match the{" "}
        <Link href="/rankings" className="underline hover:text-panel-fg">
          rankings
        </Link>{" "}
        — the share of each company actually available to trade here, which is what the PSEi is
        weighted by; the raw column stays sortable if you want it. Search, filter by sector, or
        star stocks to your watchlist. For the full ex-date schedule and payout history, see the{" "}
        <Link href="/dividends" className="underline hover:text-panel-fg">
          dividend screener
        </Link>
        . Prices are end-of-day / delayed quotes.
      </p>

      <div className="mt-8">
        <ScreenerTable rows={rows} />
      </div>
    </div>
  );
}
