import { MockQuoteSource } from "@pseye/source-quotes";
import { TreemapChart } from "@/components/TreemapChart";

export const revalidate = 86400; // once daily; matches the EOD ETL cadence

export default async function MarketMapPage() {
  const source = new MockQuoteSource();
  const quotes = await source.getDailyQuotes();

  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-xl font-semibold">PSE Market Map</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Box size = market cap. Color = today&apos;s % change. Delayed/EOD data —
        not for trading decisions.
      </p>
      <div className="mt-6">
        <TreemapChart stocks={quotes} />
      </div>
      <p className="mt-4 text-xs text-black/40 dark:text-white/40">
        Sample data — a real quote source has not been wired in yet (see project plan,
        Open Question #1).
      </p>
    </div>
  );
}
