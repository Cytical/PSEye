import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PSE_EDGE_COMPANIES } from "@pseye/source-quotes";
import { DISCLOSURE_TYPE_LABELS, DISCLOSURE_TYPE_ACCENT } from "@pseye/source-disclosures";
import { CORPORATE_ACTION_LABELS, CORPORATE_ACTION_TYPE_ACCENT } from "@pseye/source-corporate-actions";
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
import { ShareButton } from "@/components/ShareButton";

export const revalidate = 3600; // hourly; matches the quotes ETL cadence

/** Chart window — a quarter reads best at this page width. */
const HISTORY_LOOKBACK_DAYS = 90;
/** Stats window — the standard 52-week high/low frame. The ETL keeps ~4 years, so one year is safely covered. */
const STATS_LOOKBACK_DAYS = 365;

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
    alternates: {
      canonical: `/stocks/${company.ticker}`,
      types: { "application/rss+xml": `/stocks/${company.ticker}/feed.xml` },
    },
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
  const statsFrom = new Date();
  statsFrom.setUTCDate(statsFrom.getUTCDate() - STATS_LOOKBACK_DAYS);
  const statsFromIso = statsFrom.toISOString().slice(0, 10);
  const chartFrom = new Date();
  chartFrom.setUTCDate(chartFrom.getUTCDate() - HISTORY_LOOKBACK_DAYS);
  const chartFromIso = chartFrom.toISOString().slice(0, 10);

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

  // One year-deep query serves both the 52-week stats and (sliced) the chart.
  const history = quote
    ? await getHistoricalQuotes([ticker], statsFromIso, async () => quotes)
    : { source: "mock" as const, history: {} };
  const yearCloses = history.source === "real" ? (history.history[ticker] ?? []) : [];
  const closes = yearCloses.filter((c) => c.date >= chartFromIso);

  // 52-week high/low, honestly labeled: a recently listed company with less
  // than ~a year of closes gets "since <month>" instead of claiming 52 weeks.
  let yearStats: { high: number; low: number; sinceLabel: string | null; pctFromHigh: number | null } | null = null;
  if (yearCloses.length >= 20) {
    let high = -Infinity;
    let low = Infinity;
    for (const c of yearCloses) {
      if (c.close > high) high = c.close;
      if (c.close < low) low = c.close;
    }
    const coverageCutoff = new Date();
    coverageCutoff.setUTCDate(coverageCutoff.getUTCDate() - 350);
    const partial = yearCloses[0].date > coverageCutoff.toISOString().slice(0, 10);
    yearStats = {
      high,
      low,
      sinceLabel: partial
        ? new Date(yearCloses[0].date + "T00:00:00Z").toLocaleDateString("en-PH", {
            month: "short",
            year: "numeric",
            timeZone: "UTC",
          })
        : null,
      pctFromHigh: quote?.price != null && high > 0 ? (quote.price / high - 1) * 100 : null,
    };
  }

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

      <nav className="text-xs text-panel-fg/50">
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
            <h1 className="text-2xl font-semibold tracking-tight text-panel-fg">
              {company.companyName} <span className="font-mono text-lg text-panel-fg/50">({company.ticker})</span>
            </h1>
            <p className="mt-1 text-sm text-panel-fg/60">{summaryLine}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <ShareButton />
          <a
            href={`/stocks/${company.ticker}/feed.xml`}
            title={`RSS feed: ${company.ticker} disclosures, dividends & news`}
            className="flex items-center gap-1.5 rounded-md border border-panel-border px-3 py-1.5 text-xs font-medium text-panel-fg transition-colors hover:bg-panel-raised"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M4 11a9 9 0 0 1 9 9h3A12 12 0 0 0 4 8v3zm0-7a16 16 0 0 1 16 16h3A19 19 0 0 0 4 1v3zm2 13a2.5 2.5 0 1 0 0 5 2.5 2.5 0 0 0 0-5z" />
            </svg>
            RSS
          </a>
          <Link
            href={`/?ticker=${company.ticker}`}
            className="rounded-md border border-panel-border px-3 py-1.5 text-xs font-medium text-panel-fg transition-colors hover:bg-panel-raised"
          >
            View on market map
          </Link>
        </div>
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
        {yearStats && (
          <>
            <Stat
              label={yearStats.sinceLabel ? `High since ${yearStats.sinceLabel}` : "52-wk high"}
              value={formatPeso(yearStats.high)}
            />
            <Stat
              label={yearStats.sinceLabel ? `Low since ${yearStats.sinceLabel}` : "52-wk low"}
              value={formatPeso(yearStats.low)}
            />
            {yearStats.pctFromHigh != null && (
              <Stat
                label={yearStats.sinceLabel ? "vs that high" : "vs 52-wk high"}
                value={`${yearStats.pctFromHigh >= 0 ? "+" : ""}${yearStats.pctFromHigh.toFixed(1)}%`}
                tone={yearStats.pctFromHigh >= -1 ? "up" : yearStats.pctFromHigh <= -20 ? "down" : undefined}
              />
            )}
          </>
        )}
      </div>

      {closes.length >= 2 && (
        <div className="mt-6">
          <h2 className="text-sm font-medium text-panel-fg">Closing price, last {HISTORY_LOOKBACK_DAYS} days</h2>
          <div className="mt-2 rounded-lg bg-panel p-3 ring-1 ring-panel-border">
            <StockPriceChart closes={closes} />
          </div>
        </div>
      )}

      {profile && (
        <div className="mt-6">
          <h2 className="text-sm font-medium text-panel-fg">About</h2>
          <div className="mt-2 flex flex-col gap-2.5">
            {profile.description.split("\n\n").map((paragraph, i) => (
              <p key={i} className="text-sm leading-snug text-panel-fg/80">
                {paragraph}
              </p>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-panel-fg/60">{profile.source}</p>
        </div>
      )}

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <div>
          <h2 className="text-sm font-medium text-panel-fg">Recent disclosures</h2>
          {companyDisclosures.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-2">
              {companyDisclosures.map((d) => {
                const accent = DISCLOSURE_TYPE_ACCENT[d.type];
                return (
                  <li
                    key={d.referenceNo}
                    className="rounded-md bg-panel px-3 py-2.5 text-sm ring-1 ring-panel-border"
                    style={{ borderLeft: `3px solid ${accent}` }}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{ backgroundColor: `${accent}1a`, color: accent }}
                      >
                        {DISCLOSURE_TYPE_LABELS[d.type]}
                      </span>
                      <span className="ml-auto text-[11px] text-panel-fg/60">{formatRelative(d.filedAt)}</span>
                    </div>
                    {d.url ? (
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 block text-panel-fg hover:underline"
                      >
                        {d.headline} <span aria-hidden="true">↗</span>
                      </a>
                    ) : (
                      <p className="mt-1 text-panel-fg">{d.headline}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-panel-fg/50">No recent disclosures on record.</p>
          )}
          <Link href="/disclosures" className="mt-2 inline-block text-xs text-panel-fg/50 hover:underline">
            All disclosures →
          </Link>
        </div>

        <div>
          <h2 className="text-sm font-medium text-panel-fg">Dividend &amp; corporate action history</h2>
          {companyActions.length > 0 ? (
            <ul className="mt-2 flex flex-col gap-2">
              {companyActions.map((a) => {
                const accent = CORPORATE_ACTION_TYPE_ACCENT[a.type];
                return (
                  <li
                    key={`${a.type}-${a.exDate}`}
                    className="rounded-md bg-panel px-3 py-2.5 text-sm ring-1 ring-panel-border"
                    style={{ borderLeft: `3px solid ${accent}` }}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                        style={{ backgroundColor: `${accent}1a`, color: accent }}
                      >
                        {CORPORATE_ACTION_LABELS[a.type]}
                      </span>
                      <span className="ml-auto text-[11px] text-panel-fg/60">Ex-date {formatDate(a.exDate)}</span>
                    </div>
                    <p className="mt-1 text-panel-fg">{a.details}</p>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-panel-fg/50">No recent corporate actions on record.</p>
          )}
          <Link href="/calendar" className="mt-2 inline-block text-xs text-panel-fg/50 hover:underline">
            Full calendar →
          </Link>
        </div>
      </div>

      {news.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-medium text-panel-fg">In the news</h2>
          <ul className="mt-2 flex flex-col gap-2.5">
            {news.map((item) => (
              <li key={item.url} className="text-sm">
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-panel-fg hover:underline">
                  {item.title}
                </a>
                <div className="text-[11px] text-panel-fg/60">
                  {item.source} &middot; {formatRelative(item.publishedAt.toISOString())}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <RecentlyViewed excludeTicker={ticker} />

      <p className="mt-8 text-xs text-panel-fg/60">
        Delayed/EOD data from PSE Edge, not real-time. Not financial advice, a stock pick, or a
        buy/sell signal.
      </p>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  const toneClass =
    tone === "up" ? "text-[#006300] dark:text-[#0ca30c]" : tone === "down" ? "text-[#d03b3b]" : "text-panel-fg";
  return (
    <div className="rounded-lg bg-panel p-3 ring-1 ring-panel-border">
      <div className="text-[11px] text-panel-fg/50">{label}</div>
      <div className={`mt-0.5 text-lg font-semibold tabular-nums ${toneClass}`}>{value}</div>
    </div>
  );
}
