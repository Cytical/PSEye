import type { Metadata } from "next";
import Link from "next/link";
import { getVolumeLeaders } from "@/lib/volumeLeaders";
import { VolumeLeadersTable } from "@/components/VolumeLeadersTable";

export const revalidate = 3600; // matches quotes' hourly ETL cadence — same window as /rankings

export const metadata: Metadata = {
  title: "Most Active PSE Stocks — Ranked by Trading Value",
  description:
    "PSE stocks ranked by today's traded ₱ value (turnover), with share volume, price, and change. Free, no login.",
  alternates: { canonical: "/most-active" },
};

const TOP_N = 50;

export default async function MostActivePage() {
  const { rows, excludedCount } = await getVolumeLeaders();
  const top = rows.slice(0, TOP_N);

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8">
      <nav className="text-xs text-panel-fg/50">
        <Link href="/" className="hover:underline">
          Market Map
        </Link>
        <span className="mx-1.5">/</span>
        <span>Most Active</span>
      </nav>

      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-panel-fg">Most Active Stocks</h1>
      <p className="mt-1.5 max-w-3xl text-sm text-panel-fg/60">
        Ranked by today&apos;s traded ₱{" "}
        <Link href="/glossary#trading-value-volume" className="underline hover:text-panel-fg">
          value
        </Link>{" "}
        (turnover), not raw share volume — a low-priced stock trading millions of shares and a
        high-priced stock trading a few hundred both move real money, but only value puts them on
        the same scale. Prices are end-of-day / delayed quotes from PSE Edge.
        {excludedCount > 0
          ? ` ${excludedCount} tracked ${excludedCount === 1 ? "ticker has" : "tickers have"} no trading activity on record today and ${excludedCount === 1 ? "is" : "are"} excluded.`
          : ""}
      </p>

      {top.length > 0 ? (
        <div className="mt-6">
          <VolumeLeadersTable rows={top} />
        </div>
      ) : (
        <p className="mt-8 rounded-lg bg-panel p-6 text-center text-sm text-panel-fg/50 ring-1 ring-panel-border">
          No trading-volume data on record yet — this is a newly added metric and needs at least
          one quotes run to populate.
        </p>
      )}

      <p className="mt-8 text-xs text-panel-fg/60">Not financial advice, a stock pick, or a buy/sell signal.</p>
    </div>
  );
}
