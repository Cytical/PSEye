import type { Metadata } from "next";
import Link from "next/link";
import { getScreener } from "@/lib/screener";
import { WatchlistView } from "@/components/WatchlistView";

export const revalidate = 21600; // 6h safety-net ceiling; real refresh is on-demand via revalidateTag/revalidatePath from the ETL jobs (see app/api/revalidate/route.ts) — the wall-clock value only kicks in if that call ever fails.

export const metadata: Metadata = {
  title: "My Watchlist: Track Your PSE Stocks",
  description:
    "The Philippine Stock Exchange (PSE) stocks you've starred, with today's price, change, dividend yield and P/E. Kept in your browser, no account needed.",
  alternates: { canonical: "/watchlist" },
  // Every visitor's watchlist is different and the server renders an empty one,
  // so there is nothing here worth indexing — the crawler would only ever see
  // the empty state.
  robots: { index: false, follow: true },
};

/**
 * The starred-stocks page.
 *
 * The star button, the modal and the market map's "My Watchlist" filter all
 * predate this page, so until now a visitor could build a watchlist across four
 * places on the site and had nowhere to actually read it back.
 *
 * Reuses getScreener rather than adding a query: the watchlist is a filter over
 * the same full board the Explorer renders, and the intersection has to happen
 * in the browser anyway because the list lives in localStorage.
 */
export default async function WatchlistPage() {
  const rows = await getScreener();

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8">
      <p className="kicker text-accent">Tools</p>
      <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-panel-fg sm:text-3xl">
        My Watchlist
      </h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-panel-fg/65">
        The stocks you&apos;ve starred, sorted by today&apos;s move. Your list is stored in this
        browser only: there is no account, nothing is uploaded, and clearing your browser data
        clears it. To track cost basis and gain/loss instead, use the{" "}
        <Link href="/portfolio" className="underline hover:text-panel-fg">
          portfolio tracker
        </Link>
        . Prices are end-of-day or delayed.
      </p>

      <div className="mt-8">
        <WatchlistView rows={rows} />
      </div>
    </div>
  );
}
