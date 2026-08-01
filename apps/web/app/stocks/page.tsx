import type { Metadata } from "next";
import Link from "next/link";
import { PSE_EDGE_COMPANIES, PSE_SECTORS } from "@pseye/source-quotes";
import { getDailyQuotes } from "@/lib/quotes";

export const revalidate = 21600; // 6h safety-net ceiling; real refresh is on-demand via revalidateTag/revalidatePath from the ETL jobs (see app/api/revalidate/route.ts) — the wall-clock value only kicks in if that call ever fails.

export const metadata: Metadata = {
  title: "All PSE-Listed Stocks: Prices by Sector",
  description: `Directory of all ${PSE_EDGE_COMPANIES.length} PSE-listed companies tracked on PSEye, grouped by sector, with live price and today's % change.`,
  alternates: { canonical: "/stocks" },
};

function formatPeso(n: number): string {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function StocksIndexPage() {
  const quotes = await getDailyQuotes();
  const quoteByTicker = new Map(quotes.map((q) => [q.ticker, q]));

  const bySector = PSE_SECTORS.map((sector) => ({
    sector,
    companies: PSE_EDGE_COMPANIES.filter((c) => c.sector === sector).sort((a, b) =>
      a.companyName.localeCompare(b.companyName)
    ),
  })).filter((group) => group.companies.length > 0);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  // Accurate, minimal ItemList — just cites our own per-company pages, not
  // third-party content, so there's nothing here that could misrepresent
  // what the page actually is (see layout.tsx's SITE_JSON_LD comment on the
  // same principle: inaccurate structured data is worse than none).
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Market Map", item: siteUrl },
          { "@type": "ListItem", position: 2, name: "All Stocks", item: `${siteUrl}/stocks` },
        ],
      },
      {
        "@type": "ItemList",
        itemListElement: PSE_EDGE_COMPANIES.map((c, i) => ({
          "@type": "ListItem",
          position: i + 1,
          name: `${c.ticker}: ${c.companyName}`,
          url: `${siteUrl}/stocks/${c.ticker}`,
        })),
      },
    ],
  };

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="text-xs text-panel-fg/68">
        <Link href="/" className="hover:underline">
          Market Map
        </Link>
        <span className="mx-1.5">/</span>
        <span>All Stocks</span>
      </nav>

      <p className="kicker mt-2 text-accent">Market Data</p>
      <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-panel-fg sm:text-3xl">
        All PSE-Listed Stocks
      </h1>
      <p className="mt-1.5 text-sm text-panel-fg/72">
        All {PSE_EDGE_COMPANIES.length} companies tracked on PSEye, grouped by sector. Pick one for
        its price history, disclosures, and dividend record.
      </p>

      <div className="mt-8 flex flex-col gap-8">
        {bySector.map(({ sector, companies }) => (
          <div key={sector}>
            <h2 className="kicker text-panel-fg/72">
              {sector} <span className="font-normal normal-case text-panel-fg/65">({companies.length})</span>
            </h2>
            <ul className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {companies.map((c) => {
                const quote = quoteByTicker.get(c.ticker);
                // A missing % change reads as flat 0.00% site-wide — see
                // pctChangeToColor in @pseye/treemap-layout. Price keeps its
                // own null handling; "₱0.00" would be a false quote.
                const pctChange = quote?.pctChange ?? 0;
                const toneClass = pctChange >= 0 ? "text-up" : "text-down";
                return (
                  <li key={c.ticker}>
                    <Link
                      href={`/stocks/${c.ticker}`}
                      className="-mx-1.5 flex items-center justify-between gap-2 rounded px-1.5 py-1.5 text-sm transition-colors hover:bg-panel-raised"
                    >
                      <span className="min-w-0 truncate">
                        <span className="font-mono text-xs text-panel-fg/72">{c.ticker}</span>{" "}
                        <span className="text-panel-fg">{c.companyName}</span>
                      </span>
                      <span className="shrink-0 text-right tabular-nums">
                        <span className="text-panel-fg/80">
                          {quote?.price == null ? "N/A" : formatPeso(quote.price)}
                        </span>{" "}
                        <span className={toneClass}>
                          {`${pctChange >= 0 ? "+" : ""}${pctChange.toFixed(2)}%`}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>

      <p className="mt-8 text-xs text-panel-fg/72">
        Delayed/EOD data, not real-time. Not financial advice, a stock pick, or a
        buy/sell signal.
      </p>
    </div>
  );
}
