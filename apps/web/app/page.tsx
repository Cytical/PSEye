import type { Metadata } from "next";
import { getDailyQuotes } from "@/lib/quotes";
import { MarketMap } from "@/components/MarketMap";

export const revalidate = 3600; // hourly; matches the intraday ETL cadence

export const metadata: Metadata = {
  title: "Market Map",
  description:
    "PSEi stock treemap — box size is market cap, color is today's % change, grouped by PSE sector.",
};

export default async function MarketMapPage() {
  const quotes = await getDailyQuotes();

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8">
      <h1 className="text-xl font-semibold">PSE Market Map</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Box size = market cap. Color = today&apos;s % change. Delayed/EOD data —
        not for trading decisions.
      </p>
      <div className="mt-6">
        <MarketMap stocks={quotes} />
      </div>
      <p className="mt-4 text-xs text-black/40 dark:text-white/40">
        Reads from the database, refreshed hourly during PSE trading hours from PSE Edge&apos;s
        public stock data pages; falls back to sample data if the database isn&apos;t populated.
        Tickers with no reported trade show as N/A rather than a stale or fabricated price.
      </p>
    </div>
  );
}
