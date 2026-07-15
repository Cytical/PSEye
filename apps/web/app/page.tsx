import type { Metadata } from "next";
import { getDailyQuotes } from "@/lib/quotes";
import { TreemapChart } from "@/components/TreemapChart";

export const revalidate = 86400; // once daily; matches the EOD ETL cadence

export const metadata: Metadata = {
  title: "Market Map",
  description:
    "PSEi stock treemap — box size is market cap, color is today's % change, grouped by PSE sector.",
};

export default async function MarketMapPage() {
  const quotes = await getDailyQuotes();

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
        Reads from the database when populated by the daily ETL job, otherwise falls back to
        sample data — a real, legally-sound price feed is still an open question (see project
        plan, Open Question #1).
      </p>
    </div>
  );
}
