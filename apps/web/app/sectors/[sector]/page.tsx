import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PSE_SECTORS } from "@pseye/source-quotes";
import { getRankings } from "@/lib/rankings";
import { RankingsTable } from "@/components/RankingsTable";
import { sectorToSlug, slugToSector } from "@/lib/sectorSlug";

export const revalidate = 3600; // matches quotes' hourly ETL cadence — same window as /rankings

export function generateStaticParams() {
  return PSE_SECTORS.map((sector) => ({ sector: sectorToSlug(sector) }));
}

/** Peso market cap, abbreviated — same formatter as RankingsTable/ScreenerTable. */
function formatMarketCap(value: number): string {
  if (value >= 1e12) return `₱${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `₱${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `₱${(value / 1e6).toFixed(1)}M`;
  return `₱${value.toLocaleString("en-PH")}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ sector: string }>;
}): Promise<Metadata> {
  const { sector: slug } = await params;
  const sector = slugToSector(slug);
  if (!sector) return {};

  return {
    title: `${sector} Sector — PSE Stocks Ranked by Market Cap`,
    description: `Every PSE-listed ${sector} company ranked by market capitalization, with today's price and change. Free, no login.`,
    alternates: { canonical: `/sectors/${slug}` },
  };
}

export default async function SectorPage({ params }: { params: Promise<{ sector: string }> }) {
  const { sector: slug } = await params;
  const sector = slugToSector(slug);
  if (!sector) notFound();

  const { rows } = await getRankings();
  const sectorRows = rows.filter((r) => r.sector === sector);
  if (sectorRows.length === 0) notFound();

  const totalMarketCap = sectorRows.reduce((sum, r) => sum + r.marketCap, 0);
  const gainers = sectorRows.filter((r) => (r.pctChange ?? 0) > 0).length;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Market Map", item: siteUrl },
          { "@type": "ListItem", position: 2, name: "Sectors", item: `${siteUrl}/sectors` },
          { "@type": "ListItem", position: 3, name: sector, item: `${siteUrl}/sectors/${slug}` },
        ],
      },
      {
        "@type": "ItemList",
        name: `${sector} — PSE Stocks by Market Cap`,
        itemListElement: sectorRows.map((r) => ({
          "@type": "ListItem",
          position: r.sectorRank,
          name: `${r.ticker} — ${r.companyName}`,
          url: `${siteUrl}/stocks/${r.ticker}`,
        })),
      },
    ],
  };

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="text-xs text-panel-fg/50">
        <Link href="/" className="hover:underline">
          Market Map
        </Link>
        <span className="mx-1.5">/</span>
        <Link href="/sectors" className="hover:underline">
          Sectors
        </Link>
        <span className="mx-1.5">/</span>
        <span>{sector}</span>
      </nav>

      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-panel-fg">{sector}</h1>
      <p className="mt-1.5 max-w-3xl text-sm text-panel-fg/60">
        {sectorRows.length} PSE-listed {sectorRows.length === 1 ? "company" : "companies"} in{" "}
        {sector}, ranked by market capitalization. Combined market cap:{" "}
        {formatMarketCap(totalMarketCap)}. {gainers} of {sectorRows.length}{" "}
        {gainers === 1 ? "is" : "are"} up today. Prices are end-of-day / delayed quotes from PSE
        Edge.
      </p>

      <div className="mt-6">
        <RankingsTable rows={sectorRows} rankKey="sectorRank" />
      </div>

      <p className="mt-6 text-sm text-panel-fg/60">
        See how {sector} compares to every other sector on the{" "}
        <Link href={`/rankings#sector-${sector}`} className="underline hover:text-panel-fg">
          full rankings page
        </Link>
        , or browse{" "}
        <Link href="/sectors" className="underline hover:text-panel-fg">
          all sectors
        </Link>
        .
      </p>
    </div>
  );
}
