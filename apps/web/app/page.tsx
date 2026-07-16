import type { Metadata } from "next";
import { getDailyQuotes } from "@/lib/quotes";
import { getNewsByTicker } from "@/lib/companyNews";
import { MarketMap } from "@/components/MarketMap";
import { ShareButton } from "@/components/ShareButton";

export const revalidate = 3600; // hourly; matches the intraday ETL cadence

export const metadata: Metadata = {
  title: "Market Map",
  description:
    "PSEi stock treemap — box size is market cap, color is today's % change, grouped by PSE sector.",
};

export default async function MarketMapPage() {
  const [quotes, newsByTicker] = await Promise.all([getDailyQuotes(), getNewsByTicker()]);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8">
      <div className="flex items-start justify-between gap-3">
        <h1 className="text-xl font-semibold">PSE Market Map</h1>
        <ShareButton />
      </div>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Box size = market cap. Color = today&apos;s % change. Delayed/EOD data —
        not for trading decisions.
      </p>
      <div className="mt-6">
        <MarketMap stocks={quotes} newsByTicker={newsByTicker} />
      </div>
      <p className="mt-4 text-xs text-black/40 dark:text-white/40">
        Reads from the database, refreshed hourly during PSE trading hours from PSE Edge&apos;s
        public stock data pages; falls back to sample data if the database isn&apos;t populated.
        Tickers with no reported trade show as N/A rather than a stale or fabricated price.
      </p>
    </div>
  );
}
