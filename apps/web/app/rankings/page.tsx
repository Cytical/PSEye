import type { Metadata } from "next";
import Link from "next/link";
import { PSE_SECTORS } from "@pseye/source-quotes";
import { getRankings } from "@/lib/rankings";
import { RankingsTable } from "@/components/RankingsTable";

export const revalidate = 3600; // matches quotes' hourly ETL cadence — same window as the screener/market map

export const metadata: Metadata = {
  title: "Top 100 PSE Stocks by Market Cap — Company Rankings",
  description:
    "The 100 largest Philippine Stock Exchange (PSE) companies ranked by market capitalization, plus a full ranking within each sector. Free, no login.",
  alternates: { canonical: "/rankings" },
};

const TOP_N = 100;

export default async function RankingsPage() {
  const { rows, excludedCount } = await getRankings();
  const top100 = rows.slice(0, TOP_N);
  const bySector = PSE_SECTORS.map((sector) => ({
    sector,
    rows: rows.filter((r) => r.sector === sector),
  })).filter((group) => group.rows.length > 0);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  // Accurate ItemList over our own top-100 ordering, same honesty bar as
  // /stocks's JSON-LD — this is a real ranking of real listed companies by
  // real market cap, not an estimate, so citing it as structured data is safe.
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Market Map", item: siteUrl },
          { "@type": "ListItem", position: 2, name: "Rankings", item: `${siteUrl}/rankings` },
        ],
      },
      {
        "@type": "ItemList",
        name: "Top 100 PSE Stocks by Market Cap",
        itemListElement: top100.map((r) => ({
          "@type": "ListItem",
          position: r.overallRank,
          name: `${r.ticker} — ${r.companyName}`,
          url: `${siteUrl}/stocks/${r.ticker}`,
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: [
          {
            "@type": "Question",
            name: "Does this ranking include private (non-listed) Philippine companies?",
            acceptedAnswer: {
              "@type": "Answer",
              text: "No. This ranking covers only the companies listed on the Philippine Stock Exchange, because market capitalization requires a public share price and share count — both published by the exchange. Private companies don't have an exchange-quoted price, so any 'estimated' valuation for one would be a guess dressed up as data. PSEye only publishes figures traceable to a real published source, so private companies are left out rather than estimated.",
              },
          },
        ],
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
        <span>Rankings</span>
      </nav>

      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-panel-fg">Company Rankings</h1>
      <p className="mt-1.5 max-w-3xl text-sm text-panel-fg/60">
        Every tracked PSE-listed company ranked by{" "}
        <Link href="/glossary#market-capitalization" className="underline hover:text-panel-fg">
          market capitalization
        </Link>{" "}
        — the top 100 across the whole exchange, and a full ranking within each of its{" "}
        {bySector.length}{" "}
        <Link href="/sectors" className="underline hover:text-panel-fg">
          sectors
        </Link>
        . Prices are end-of-day / delayed quotes from PSE Edge.
        {excludedCount > 0
          ? ` ${excludedCount} tracked ${excludedCount === 1 ? "ticker has" : "tickers have"} no market cap on file and ${excludedCount === 1 ? "is" : "are"} excluded rather than ranked.`
          : ""}
      </p>

      <details className="mt-4 max-w-3xl rounded-lg bg-panel px-4 py-3 text-sm ring-1 ring-panel-border">
        <summary className="cursor-pointer font-medium text-panel-fg">
          Does this include private (non-listed) companies?
        </summary>
        <p className="mt-2 text-panel-fg/70">
          No — and it never will as an &quot;estimate.&quot; Market cap needs a real public share
          price and share count, both published by the exchange. A private company has neither, so
          any number PSEye showed for one would be a guess, not data. Every figure on this site
          traces back to a real published source (PSE Edge or a PSE-published report); this ranking
          stays limited to the {rows.length + excludedCount} companies actually listed on the PSE
          rather than mixing in fabricated estimates for the rest.
        </p>
      </details>

      <section className="mt-8">
        <h2 className="text-lg font-semibold tracking-tight text-panel-fg">
          Top {Math.min(TOP_N, top100.length)} by Market Cap
        </h2>
        <div className="mt-3">
          <RankingsTable rows={top100} rankKey="overallRank" />
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold tracking-tight text-panel-fg">By Sector</h2>
        <nav aria-label="Jump to sector" className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
          {bySector.map(({ sector }) => (
            <a key={sector} href={`#sector-${sector}`} className="text-panel-fg/60 hover:text-panel-fg hover:underline">
              {sector}
            </a>
          ))}
        </nav>

        <div className="mt-6 flex flex-col gap-8">
          {bySector.map(({ sector, rows: sectorRows }) => (
            <div key={sector} id={`sector-${sector}`} className="scroll-mt-20">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-panel-fg/60">
                {sector} <span className="font-normal normal-case text-panel-fg/40">({sectorRows.length})</span>
              </h3>
              <div className="mt-2">
                <RankingsTable rows={sectorRows} rankKey="sectorRank" />
              </div>
            </div>
          ))}
        </div>
      </section>

      <p className="mt-8 text-xs text-panel-fg/60">
        Ranked by market capitalization (price × shares outstanding), not free-float-adjusted. Not
        financial advice, a stock pick, or a buy/sell signal.
      </p>
    </div>
  );
}
