import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PSE_EDGE_COMPANIES } from "@pseye/source-quotes";
import { DISCLOSURE_TYPE_LABELS } from "@pseye/source-disclosures";
import { CORPORATE_ACTION_LABELS } from "@pseye/source-corporate-actions";
import { getDailyQuotes } from "@/lib/quotes";
import { getCompanyProfiles } from "@/lib/companyProfiles";
import { getDisclosures } from "@/lib/disclosures";
import { getCorporateActions } from "@/lib/corporateActions";
import { getNewsForTicker } from "@/lib/news";
import { getHistoricalQuotes } from "@/lib/historicalQuotes";
import { StockPriceChart } from "@/components/StockPriceChart";
import { WatchlistStarButton } from "@/components/WatchlistStarButton";
import { RecordStockView } from "@/components/RecordStockView";
import { RecentlyViewed } from "@/components/RecentlyViewed";

export const revalidate = 3600; // hourly; matches the quotes ETL cadence

const HISTORY_LOOKBACK_DAYS = 90;

function findCompany(tickerParam: string) {
  const upper = tickerParam.toUpperCase();
  return PSE_EDGE_COMPANIES.find((c) => c.ticker === upper);
}

export function generateStaticParams() {
  return PSE_EDGE_COMPANIES.map((c) => ({ ticker: c.ticker }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticker: string }>;
}): Promise<Metadata> {
  const { ticker } = await params;
  const company = findCompany(ticker);
  if (!company) return {};

  const title = `${company.ticker} — ${company.companyName} Stock Price & Info`;
  const description = `${company.companyName} (${company.ticker}) on the Philippine Stock Exchange: latest EOD price, market cap rank, sector, recent disclosures, and dividend history.`;

  return {
    title,
    description,
    alternates: { canonical: `/stocks/${company.ticker}` },
    openGraph: { title, description },
  };
}

function formatPeso(n: number): string {
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatMarketCap(n: number): string {
  if (n >= 1e12) return `₱${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `₱${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `₱${(n / 1e6).toFixed(1)}M`;
  return `₱${n.toFixed(0)}`;
}

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.round(diffMs / 3_600_000);
  if (hours < 1) return "just now";
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export default async function StockPage({ params }: { params: Promise<{ ticker: string }> }) {
  const { ticker: tickerParam } = await params;
  const company = findCompany(tickerParam);
  if (!company) notFound();

  const ticker = company.ticker;
  const fromDate = new Date();
  fromDate.setUTCDate(fromDate.getUTCDate() - HISTORY_LOOKBACK_DAYS);
  const fromIso = fromDate.toISOString().slice(0, 10);

  const [quotes, profiles, disclosures, corporateActions, news] = await Promise.all([
    getDailyQuotes(),
    getCompanyProfiles(),
    getDisclosures(),
    getCorporateActions(),
    getNewsForTicker(ticker),
  ]);

  const quote = quotes.find((q) => q.ticker === ticker);
  const profile = profiles[ticker] ?? null;
  const companyDisclosures = disclosures.filter((d) => d.ticker === ticker).slice(0, 8);
  const companyActions = corporateActions.filter((a) => a.ticker === ticker).slice(0, 8);

  const sector = quote?.sector ?? company.sector;
  const rankedByMarketCap = [...quotes].sort((a, b) => b.marketCap - a.marketCap);
  const rank = rankedByMarketCap.findIndex((q) => q.ticker === ticker) + 1;
  const sectorRanked = rankedByMarketCap.filter((q) => q.sector === sector);
  const sectorRank = sectorRanked.findIndex((q) => q.ticker === ticker) + 1;
  const summaryLine = `${sector} · #${rank} by market cap of ${quotes.length} tracked PSE stocks · #${sectorRank} of ${sectorRanked.length} in sector`;

  const history = quote
    ? await getHistoricalQuotes([ticker], fromIso, async () => quotes)
    : { source: "mock" as const, history: {} };
  const closes = history.source === "real" ? (history.history[ticker] ?? []) : [];

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  // @graph bundles the company identity with a BreadcrumbList — Google renders the
  // latter as a breadcrumb trail under the search result (instead of the raw URL),
  // which is a free click-through-rate lever, not just cosmetic markup.
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Corporation",
        name: company.companyName,
        tickerSymbol: company.ticker,
        url: `${siteUrl}/stocks/${company.ticker}`,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Market Map", item: siteUrl },
          { "@type": "ListItem", position: 2, name: company.ticker, item: `${siteUrl}/stocks/${company.ticker}` },
        ],
      },
    ],
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <RecordStockView ticker={ticker} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="text-xs text-black/50 dark:text-white/50">
        <Link href="/" className="hover:underline">
          Market Map
        </Link>
        <span className="mx-1.5">/</span>
        <span>{company.ticker}</span>
      </nav>

      <div className="mt-2 flex flex-wrap items-baseline justify-between gap-3">
        <div className="flex items-baseline gap-2">
          <WatchlistStarButton ticker={company.ticker} size={22} className="translate-y-0.5" />
          <div>
            <h1 className="text-2xl font-semibold">
              {company.companyName} <span className="font-mono text-lg text-black/50 dark:text-white/50">({company.ticker})</span>
            </h1>
            <p className="mt-1 text-sm text-black/60 dark:text-white/60">{summaryLine}</p>
          </div>
        </div>
        <Link
          href={`/?ticker=${company.ticker}`}
          className="shrink-0 rounded-md border border-black/10 px-3 py-1.5 text-xs font-medium hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
        >
          View on market map
        </Link>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Price" value={quote?.price == null ? "N/A" : formatPeso(quote.price)} />
        <Stat
          label="Today"
          value={quote?.pctChange == null ? "N/A" : `${quote.pctChange >= 0 ? "+" : ""}${quote.pctChange.toFixed(2)}%`}
          tone={quote?.pctChange == null ? undefined : quote.pctChange >= 0 ? "up" : "down"}
        />
        <Stat label="Market cap" value={quote ? formatMarketCap(quote.marketCap) : "N/A"} />
        <Stat label="Sector" value={sector} />
      </div>

      {closes.length >= 2 && (
        <div className="mt-6">
          <h2 className="text-sm font-medium">Closing price, last {HISTORY_LOOKBACK_DAYS} days</h2>
          <div className="mt-2">
            <StockPriceChart closes={closes} />
          </div>
        </div>
      )}

      {profile && (
        <div className="mt-6">
          <h2 className="text-sm font-medium">About</h2>
          <div className="mt-2 flex flex-col gap-2.5">
            {profile.description.split("\n\n").map((paragraph, i) => (
              <p key={i} className="text-sm leading-snug text-black/80 dark:text-white/80">
                {paragraph}
              </p>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-black/40 dark:text-white/40">{profile.source}</p>
        </div>
      )}

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="text-sm font-medium">Recent disclosures</h2>
          {companyDisclosures.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-2.5">
              {companyDisclosures.map((d) => (
                <li key={d.referenceNo} className="text-sm">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="rounded-full border border-black/15 px-2 py-0.5 text-[10px] text-black/60 dark:border-white/15 dark:text-white/60">
                      {DISCLOSURE_TYPE_LABELS[d.type]}
                    </span>
                    <span className="text-[11px] text-black/40 dark:text-white/40">{formatRelative(d.filedAt)}</span>
                  </div>
                  <p className="mt-0.5">{d.headline}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-black/50 dark:text-white/50">No recent disclosures on record.</p>
          )}
          <Link href="/disclosures" className="mt-2 inline-block text-xs text-black/50 hover:underline dark:text-white/50">
            All disclosures →
          </Link>
        </div>

        <div>
          <h2 className="text-sm font-medium">Dividend &amp; corporate action history</h2>
          {companyActions.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-2.5">
              {companyActions.map((a) => (
                <li key={`${a.type}-${a.exDate}`} className="text-sm">
                  <div className="flex flex-wrap items-baseline gap-2">
                    <span className="rounded-full border border-black/15 px-2 py-0.5 text-[10px] dark:border-white/15">
                      {CORPORATE_ACTION_LABELS[a.type]}
                    </span>
                    <span className="text-[11px] text-black/40 dark:text-white/40">Ex-date {formatDate(a.exDate)}</span>
                  </div>
                  <p className="mt-0.5">{a.details}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-black/50 dark:text-white/50">No recent corporate actions on record.</p>
          )}
          <Link href="/calendar" className="mt-2 inline-block text-xs text-black/50 hover:underline dark:text-white/50">
            Full calendar →
          </Link>
        </div>
      </div>

      {news.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-medium">In the news</h2>
          <ul className="mt-2 flex flex-col gap-2.5">
            {news.map((item) => (
              <li key={item.url} className="text-sm">
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  {item.title}
                </a>
                <div className="text-[11px] text-black/40 dark:text-white/40">
                  {item.source} &middot; {formatRelative(item.publishedAt.toISOString())}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <RecentlyViewed excludeTicker={ticker} />

      <p className="mt-8 text-xs text-black/40 dark:text-white/40">
        Delayed/EOD data from PSE Edge, not real-time. Not financial advice, a stock pick, or a
        buy/sell signal.
      </p>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  const toneClass = tone === "up" ? "text-[#006300] dark:text-[#0ca30c]" : tone === "down" ? "text-[#d03b3b]" : "";
  return (
    <div className="rounded-md border border-black/10 p-3 dark:border-white/10">
      <div className="text-[11px] text-black/50 dark:text-white/50">{label}</div>
      <div className={`mt-0.5 text-lg font-semibold tabular-nums ${toneClass}`}>{value}</div>
    </div>
  );
}
