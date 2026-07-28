import type { Metadata } from "next";
import Link from "next/link";
import { getRankings } from "@/lib/rankings";
import { sectorToSlug, VISIBLE_SECTORS } from "@/lib/sectorSlug";

export const revalidate = 3600; // matches quotes' hourly ETL cadence — same window as /rankings

export const metadata: Metadata = {
  title: "PSE Sectors — Browse Philippine Stocks by Industry",
  description:
    "Every PSE-listed company grouped by sector — Financials, Industrial, Holding Firms, Property, Services, Mining & Oil, and ETFs — ranked by market cap. Free, no login.",
  alternates: { canonical: "/sectors" },
};

/** Peso market cap, abbreviated — same formatter as RankingsTable/ScreenerTable. */
function formatMarketCap(value: number): string {
  if (value >= 1e12) return `₱${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `₱${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `₱${(value / 1e6).toFixed(1)}M`;
  return `₱${value.toLocaleString("en-PH")}`;
}

export default async function SectorsPage() {
  const { rows } = await getRankings();

  const sectors = VISIBLE_SECTORS.map((sector) => {
    const sectorRows = rows.filter((r) => r.sector === sector);
    const totalMarketCap = sectorRows.reduce((sum, r) => sum + r.marketCap, 0);
    return { sector, slug: sectorToSlug(sector), count: sectorRows.length, totalMarketCap };
  }).filter((s) => s.count > 0);

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8">
      <nav className="text-xs text-panel-fg/68">
        <Link href="/" className="hover:underline">
          Market Map
        </Link>
        <span className="mx-1.5">/</span>
        <span>Sectors</span>
      </nav>

      <h1 className="mt-2 font-serif text-2xl font-semibold tracking-tight text-panel-fg sm:text-3xl">Sectors</h1>
      <p className="mt-1.5 max-w-3xl text-sm text-panel-fg/72">
        Every tracked PSE-listed company grouped by sector. Pick one to see its full ranking by
        market capitalization, or see all sectors together on the{" "}
        <Link href="/rankings" className="underline hover:text-panel-fg">
          rankings page
        </Link>
        .
      </p>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sectors.map(({ sector, slug, count, totalMarketCap }) => (
          <Link
            key={sector}
            href={`/sectors/${slug}`}
            className="rounded-xl bg-panel p-4 shadow-sm shadow-black/5 ring-1 ring-panel-border transition-colors hover:bg-panel-raised"
          >
            <div className="text-base font-semibold text-panel-fg">{sector}</div>
            <div className="mt-1 text-xs text-panel-fg/72">
              {count} {count === 1 ? "company" : "companies"} · {formatMarketCap(totalMarketCap)} combined
              market cap
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
