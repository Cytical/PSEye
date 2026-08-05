import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PSE_EDGE_COMPANIES } from "@pseye/source-quotes";
import { DISCLOSURE_TYPE_LABELS, DISCLOSURE_TYPE_ACCENT } from "@pseye/source-disclosures";
import { getDailyQuotes } from "@/lib/quotes";
import { getCompanyProfiles, type CompanyProfile } from "@/lib/companyProfiles";
import { getCompanyFinancials } from "@/lib/companyFinancials";
import { getDisclosures } from "@/lib/disclosures";
import { getCorporateActions } from "@/lib/corporateActions";
import { manilaToday } from "@/lib/manilaDate";
import { byInvestableCapDesc } from "@/lib/floatAdjustedCap";
import { getNewsForTicker } from "@/lib/news";
import { getHistoricalQuotes } from "@/lib/historicalQuotes";
import { StockPriceChart } from "@/components/StockPriceChart";
import { StockAnalytics } from "@/components/StockAnalytics";
import { CompanyFinancials, hasAnyFinancialData } from "@/components/CompanyFinancials";
import { CompanyLeadership, hasAnyLeadershipData } from "@/components/CompanyLeadership";
import { CompanyLogo } from "@/components/CompanyLogo";
import {
  StockStatistics,
  StockSeasonality,
  statisticsSampleSize,
  type DividendSummary,
} from "@/components/StockStatistics";
import { parseDividendAmount } from "@/lib/dividends";
import { WatchlistStarButton } from "@/components/WatchlistStarButton";
import { RecordStockView } from "@/components/RecordStockView";
import { RecentlyViewed } from "@/components/RecentlyViewed";
import { ShareButton } from "@/components/ShareButton";
import { sectorToSlug } from "@/lib/sectorSlug";
import { Kpi } from "@/components/Kpi";
import { Panel } from "@/components/Panel";
import { RangeBar } from "@/components/RangeBar";

// 2026-08-03: switched off ISR entirely (was revalidate = 3600, briefly 21600)
// after 282 possible tickers × real/crawler traffic every hour turned out to be
// the single biggest driver of that day's ISR Writes quota exhaustion (confirmed
// via runtime logs showing 88+ distinct requestPaths hit in 3 days with zero
// deploys in that window). force-dynamic renders fresh on every request instead
// of writing a page-level cache entry, so this route now contributes zero ISR
// Writes — the actual DB reads stay cheap since getDailyQuotes/getCompanyProfiles/
// getDisclosures/getCorporateActions/getHistoricalQuotes (lib/*.ts) already sit
// behind their own unstable_cache (~1h window), independent of this page setting.
export const dynamic = "force-dynamic";

/** Chart window — a quarter reads best at this page width. */
const HISTORY_LOOKBACK_DAYS = 90;
/** Stats window — the standard 52-week high/low frame. The ETL keeps ~4 years, so one year is safely covered. */
const STATS_LOOKBACK_DAYS = 365;

/**
 * Height of each of the two above-the-fold dashboard rows. Sized so the whole
 * dashboard — title, hero strip, and both rows — lands inside roughly a
 * 1000px-tall viewport, which is the point of the layout: the panels scroll
 * internally so that adding a 30-item disclosure list can never push the row
 * below it off screen. Only applied from `lg` up; below that the rows collapse
 * to a single column and take their natural heights, since a fixed 20rem panel
 * on a phone would be almost entirely scrollbar.
 */
const DASH_ROW = "flex flex-col gap-3 lg:h-[19.5rem] lg:flex-row 2xl:h-[21rem]";
/**
 * Panel widths within a `DASH_ROW`. Flex basis + grow rather than a 12-column
 * grid's `col-span-*`, specifically so a row heals when a panel doesn't
 * render: Chart, Analytics, and Statistics all require real DB-backed history,
 * and a ticker without it drops all three, which under `col-span-*` left
 * literal empty columns. Here the survivors absorb the space instead —
 * half/quarter/quarter when everything is present, an even split when the wide
 * panel is missing.
 */
const SPAN_WIDE = "min-w-0 lg:basis-1/2 lg:grow-[2]";
const SPAN_SIDE = "min-w-0 lg:basis-1/4 lg:grow";

function findCompany(tickerParam: string) {
  const upper = tickerParam.toUpperCase();
  return PSE_EDGE_COMPANIES.find((c) => c.ticker === upper);
}

/**
 * Only the PSEi30 constituents are prerendered at build time. Every deploy
 * writes every path returned here into the ISR cache (that's what pushed
 * Vercel's "ISR Writes" metric to 75% of the free-tier quota with all 282
 * companies here — full roster × several deploys/day added up fast). The
 * other ~250 tickers still work identically: `dynamicParams` defaults to
 * true, so an unlisted ticker renders on its first real visit and is cached
 * from then on, same as any other ISR page — just written once, on demand,
 * instead of on every deploy regardless of whether anyone looks.
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ ticker: string }>;
}): Promise<Metadata> {
  const { ticker } = await params;
  const company = findCompany(ticker);
  if (!company) return {};

  const title = `${company.ticker} Stock Price Today: ${company.companyName} (PSE)`;
  const description = `${company.companyName} (PSE: ${company.ticker}): live price, market-cap rank, sector, 52-week range, dividend history, and latest disclosures.`;

  return {
    title,
    description,
    alternates: {
      canonical: `/stocks/${company.ticker}`,
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

/** Share counts and ₱ turnover both run into the billions — compact or the hero rail can't hold them. */
function formatCompact(n: number): string {
  if (n >= 1e12) return `${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return n.toLocaleString("en-PH");
}

/** First sentence of the SEC-sourced description — a plain-English "what
 * does this company do" line for a visitor who doesn't yet know what an
 * RSI or a Sharpe ratio is, surfaced right under the ticker instead of only
 * appearing in the full "About" panel below the quantitative dashboard. SEC
 * 17-A descriptions reliably open with an identifying sentence ("X was
 * incorporated on... to serve as...", "X is engaged in..."), so this is a
 * cheap, honest summary rather than a truncation that could cut mid-thought. */
function firstSentence(description: string): string {
  const match = description.match(/^.*?[.!?](?=\s|$)/);
  return (match?.[0] ?? description).trim();
}

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Facts from the same PSE Edge company-info page's Security/Contact
 * Information tables, alongside the SEC-sourced description — every field is
 * independently optional, so this only lists whichever ones a given company
 * actually has. No board member names: PSE Edge only ever publishes a
 * headcount, never who they are, and there's no free source that does (SEC
 * Philippines, which has the real filing, is bot-blocked). */
function buildCompanyFacts(profile: CompanyProfile): { label: string; value: React.ReactNode }[] {
  const facts: { label: string; value: React.ReactNode }[] = [];
  if (profile.incorporationDate) facts.push({ label: "Incorporated", value: profile.incorporationDate });
  if (profile.numberOfDirectors != null) {
    facts.push({ label: "Board size", value: `${profile.numberOfDirectors} directors` });
  }
  if (profile.fiscalYearEnd) facts.push({ label: "Fiscal year end", value: profile.fiscalYearEnd });
  if (profile.externalAuditor) facts.push({ label: "External auditor", value: profile.externalAuditor });
  if (profile.businessAddress) facts.push({ label: "Headquarters", value: profile.businessAddress });
  if (profile.website) {
    const href = profile.website.startsWith("http") ? profile.website : `https://${profile.website}`;
    facts.push({
      label: "Website",
      value: (
        <a href={href} target="_blank" rel="noopener noreferrer" className="hover:underline">
          {profile.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
        </a>
      ),
    });
  }
  return facts;
}

/** Empty state for a fixed-height panel: centered, so a "nothing here" line
 * doesn't sit alone in the top-left corner of an otherwise blank card. */
function PanelEmpty({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center px-4 py-6 text-center text-xs text-panel-fg/60">
      {children}
    </div>
  );
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

  const [quotes, profiles, financials, disclosures, corporateActions, news] = await Promise.all([
    getDailyQuotes(),
    getCompanyProfiles(),
    getCompanyFinancials(),
    getDisclosures(),
    getCorporateActions(),
    getNewsForTicker(ticker),
  ]);

  const quote = quotes.find((q) => q.ticker === ticker);
  const profile = profiles[ticker] ?? null;
  const companyFinancials = financials[ticker];
  const hasFinancials = companyFinancials != null && hasAnyFinancialData(companyFinancials);
  // The panels these feed scroll internally now, so a longer list costs no
  // layout height — worth showing more than the 8 the old fixed-height columns
  // could fit before they started pushing sibling sections down the page.
  const companyDisclosures = disclosures.filter((d) => d.ticker === ticker).slice(0, 25);

  const sector = quote?.sector ?? company.sector;
  // Float-adjusted, so the "#N of M" here matches the board /rankings
  // publishes and the box sizes on the market map — see lib/floatAdjustedCap.ts.
  const rankedByMarketCap = [...quotes].sort(byInvestableCapDesc);
  const rank = rankedByMarketCap.findIndex((q) => q.ticker === ticker) + 1;
  const sectorRanked = rankedByMarketCap.filter((q) => q.sector === sector);
  const selfSectorIndex = sectorRanked.findIndex((q) => q.ticker === ticker);
  const sectorRank = selfSectorIndex + 1;

  // Peers nearest in market-cap rank within the same sector, not just the
  // sector's biggest names — more genuinely "similar" for a small-cap stock
  // than always pointing at the same handful of blue chips regardless of size.
  // Wider window than before for the same reason the lists above are longer.
  const PEER_COUNT = 10;
  let peerWindowStart = Math.max(0, selfSectorIndex - Math.floor(PEER_COUNT / 2));
  const peerWindowEnd = Math.min(sectorRanked.length, peerWindowStart + PEER_COUNT + 1);
  peerWindowStart = Math.max(0, peerWindowEnd - (PEER_COUNT + 1));
  const sectorPeers = sectorRanked
    .slice(peerWindowStart, peerWindowEnd)
    .filter((q) => q.ticker !== ticker)
    .slice(0, PEER_COUNT);

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

  // Trailing-12-month cash dividend → yield, reusing the corporate-actions the
  // page already fetched and dividends.ts's amount parser. statsFromIso is
  // exactly 365 days back, so it doubles as the TTM window start.
  const todayIso = manilaToday();
  let ttmDividend = 0;
  let dividendPayoutCount = 0;
  for (const a of corporateActions) {
    if (a.ticker !== ticker || a.type !== "cash_dividend") continue;
    if (a.exDate > todayIso || a.exDate < statsFromIso) continue;
    const amount = parseDividendAmount(a.details);
    if (amount != null) {
      ttmDividend += amount;
      dividendPayoutCount += 1;
    }
  }
  const dividendSummary: DividendSummary | null =
    dividendPayoutCount > 0
      ? {
          yieldPct:
            quote?.price != null && quote.price > 0 && ttmDividend > 0
              ? (ttmDividend / quote.price) * 100
              : null,
          ttm: ttmDividend,
          payoutCount: dividendPayoutCount,
        }
      : null;

  // Previous close is derivable from the two fields the quote already carries,
  // so the hero can show the peso move alongside the percentage without the
  // ETL storing a third column. Guarded against the -100% (price went to zero)
  // case that would divide by zero.
  const prevClose =
    quote?.price != null && quote.pctChange != null && quote.pctChange !== -100
      ? quote.price / (1 + quote.pctChange / 100)
      : null;
  const pesoChange = quote?.price != null && prevClose != null ? quote.price - prevClose : null;

  // Only the fields this particular quote actually has — a rail of "—"
  // placeholders would be worse than a shorter rail.
  const heroStats: { label: string; value: string; hint?: string }[] = [];
  if (quote) heroStats.push({ label: "Market cap", value: formatMarketCap(quote.marketCap) });
  if (prevClose != null) heroStats.push({ label: "Prev close", value: formatPeso(prevClose) });
  if (quote?.volume != null) heroStats.push({ label: "Volume", value: formatCompact(quote.volume), hint: "shares" });
  if (quote?.value != null) heroStats.push({ label: "Turnover", value: `₱${formatCompact(quote.value)}`, hint: "today" });
  if (quote?.freeFloatPct != null)
    heroStats.push({ label: "Free float", value: `${quote.freeFloatPct.toFixed(1)}%` });
  if (dividendSummary?.yieldPct != null)
    heroStats.push({ label: "Div yield", value: `${dividendSummary.yieldPct.toFixed(2)}%`, hint: "TTM" });

  const companyFacts = profile ? buildCompanyFacts(profile) : [];
  const statsSample = yearCloses.length > 0 ? statisticsSampleSize(yearCloses) : null;
  // "Dec 20, 1967" parses fine via the Date constructor; anything PSE Edge
  // phrases differently (rare, but seen as blank/placeholder on a handful of
  // companies) just fails silently and omits foundingDate rather than
  // emitting invalid structured data.
  const foundingDateIso = (() => {
    if (!profile?.incorporationDate) return null;
    const d = new Date(profile.incorporationDate);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  })();
  const sameAs = [profile?.website, profile?.wikipediaUrl].filter((v): v is string => Boolean(v));

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const sectorHref = `/sectors/${sectorToSlug(sector)}`;
  // @graph bundles the company identity with a BreadcrumbList — Google renders the
  // latter as a breadcrumb trail under the search result (instead of the raw URL),
  // which is a free click-through-rate lever, not just cosmetic markup. Its three
  // levels mirror the visible trail in the header exactly, which is what Google's
  // breadcrumb guidance asks for. The profile-derived fields
  // (address/foundingDate/sameAs) are exactly the kind of entity-disambiguation
  // signal Google's docs point to sameAs for — omitted entirely (not emitted as
  // null) when the profile hasn't backfilled them.
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Corporation",
        name: company.companyName,
        tickerSymbol: company.ticker,
        url: `${siteUrl}/stocks/${company.ticker}`,
        ...(profile?.businessAddress ? { address: profile.businessAddress } : {}),
        ...(foundingDateIso ? { foundingDate: foundingDateIso } : {}),
        ...(sameAs.length > 0 ? { sameAs } : {}),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Market Map", item: siteUrl },
          { "@type": "ListItem", position: 2, name: sector, item: `${siteUrl}${sectorHref}` },
          { "@type": "ListItem", position: 3, name: company.ticker, item: `${siteUrl}/stocks/${company.ticker}` },
        ],
      },
    ],
  };

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-8 pt-4 sm:px-6">
      <RecordStockView ticker={ticker} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Title bar. Two lines total: the old header spent four (breadcrumb,
          kicker, name, summary) before a single number appeared. The breadcrumb
          is folded into the meta line rather than getting a row of its own. */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex min-w-0 items-center gap-2">
          <CompanyLogo logoImage={profile?.logoImage ?? null} alt={`${company.companyName} logo`} />
          <WatchlistStarButton ticker={company.ticker} size={20} />
          <h1 className="flex min-w-0 flex-wrap items-baseline gap-x-2.5 leading-tight">
            <span className="font-mono text-lg font-bold tracking-tight text-accent">{company.ticker}</span>
            <span className="truncate font-serif text-xl font-semibold tracking-tight text-panel-fg">
              {company.companyName}
            </span>
          </h1>
        </div>
        {profile && (
          <p className="w-full max-w-2xl text-xs leading-snug text-panel-fg/65">
            {firstSentence(profile.description)}
          </p>
        )}
        <div className="flex shrink-0 items-center gap-2">
          <ShareButton
            shareTitle={`${company.ticker}: ${company.companyName}`}
            shareText={
              quote?.price == null
                ? `${company.ticker} (${company.companyName}) on PSEye`
                : `${company.ticker} ${formatPeso(quote.price)} (${(quote.pctChange ?? 0) >= 0 ? "+" : ""}${(
                    quote.pctChange ?? 0
                  ).toFixed(2)}%) on PSEye`
            }
          />
          <Link
            href={`/?ticker=${company.ticker}`}
            className="rounded-md border border-panel-border px-3 py-1.5 text-xs font-medium text-panel-fg transition-colors hover:bg-panel-raised"
          >
            View on market map
          </Link>
        </div>
      </div>

      <nav aria-label="Breadcrumb" className="mt-1 flex flex-wrap items-center gap-x-1.5 text-xs text-panel-fg/68">
        <Link href="/" className="hover:underline">
          Market Map
        </Link>
        <span aria-hidden="true">/</span>
        <Link href={sectorHref} className="hover:underline">
          {sector}
        </Link>
        <span aria-hidden="true">/</span>
        <span className="text-panel-fg/85">{company.ticker}</span>
        {/* rank is 0 for a ticker with no quote row at all, which gets no rank
            text rather than "#0 of 282". The separator lives inside the branch
            so it doesn't leave a dangling middot in that case. */}
        {rank > 0 && (
          <>
            <span aria-hidden="true" className="mx-1 text-panel-fg/40">
              &middot;
            </span>
            <span>
              #{rank} of {rankedByMarketCap.length} by float-adjusted market cap
            </span>
            <span aria-hidden="true" className="mx-1 text-panel-fg/40">
              &middot;
            </span>
            <span>
              #{sectorRank} of {sectorRanked.length} in sector
            </span>
          </>
        )}
      </nav>

      {/* Hero strip: price, where it sits in its own 52-week range, and the
          quote fields the page never used to surface at all (volume, turnover,
          free float), in one band instead of two half-empty cards. */}
      <div className="mt-3 flex flex-col gap-x-5 gap-y-3 rounded-xl bg-panel p-3 shadow-sm shadow-black/5 ring-1 ring-panel-border lg:flex-row">
        <div className="min-w-0 lg:w-[190px] lg:shrink-0">
          <div className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <span className="text-[30px] font-bold leading-none tracking-tight tabular-nums text-panel-fg">
              {quote?.price == null ? "N/A" : formatPeso(quote.price)}
            </span>
            {/* Rendered whenever there's a quote row at all: a null % change
                shows as flat 0.00% rather than being hidden, matching the map
                and every table — see pctChangeToColor in @pseye/treemap-layout. */}
            {quote != null && (
              <span
                className={`text-sm font-semibold tabular-nums ${(quote.pctChange ?? 0) >= 0 ? "text-up" : "text-down"}`}
              >
                {pesoChange != null && `${pesoChange >= 0 ? "+" : "−"}${Math.abs(pesoChange).toFixed(2)} `}
                ({(quote.pctChange ?? 0) >= 0 ? "+" : ""}
                {(quote.pctChange ?? 0).toFixed(2)}%)
              </span>
            )}
          </div>
          <div className="mt-1 text-[10.5px] text-panel-fg/60">
            Latest close{closes.length > 0 ? ` · ${formatDate(closes[closes.length - 1].date)}` : ""}
          </div>
        </div>

        {yearStats && (
          <div className="min-w-0 lg:w-[300px] lg:shrink-0 lg:border-l lg:border-panel-border lg:pl-6">
            <div className="flex items-baseline justify-between gap-2">
              <span className="kicker text-panel-fg/60">
                {yearStats.sinceLabel ? `Range since ${yearStats.sinceLabel}` : "52-week range"}
              </span>
              {yearStats.pctFromHigh != null && (
                <span
                  className={`text-sm font-semibold tabular-nums ${
                    yearStats.pctFromHigh >= -1 ? "text-up" : yearStats.pctFromHigh <= -20 ? "text-down" : "text-panel-fg/75"
                  }`}
                >
                  {yearStats.pctFromHigh >= 0 ? "+" : ""}
                  {yearStats.pctFromHigh.toFixed(1)}% vs high
                </span>
              )}
            </div>
            <div className="mt-4">
              <RangeBar
                low={yearStats.low}
                high={yearStats.high}
                current={quote?.price ?? null}
                lowLabel={formatPeso(yearStats.low)}
                highLabel={formatPeso(yearStats.high)}
                size="lg"
              />
            </div>
          </div>
        )}

        {heroStats.length > 0 && (
          // The rail holds anywhere from two to six metrics depending on what
          // the quote actually carries, so its columns are auto-fit rather than
          // a fixed count — a hard `grid-cols-6` squeezed a two-metric rail
          // into sixths, truncating labels to "M…" and colliding the values.
          // No width cap here (unlike the old `size="md"` rail): with the
          // sparkline gone this is the section meant to fill the rest of the
          // strip, so a two-metric quote gets two large tiles instead of two
          // small ones stranded on the left.
          <div
            className="grid min-w-0 flex-1 grid-cols-[repeat(auto-fit,minmax(110px,1fr))] gap-x-6 gap-y-3 lg:border-l lg:border-panel-border lg:pl-6"
          >
            {heroStats.map((s) => (
              <Kpi key={s.label} label={s.label} value={s.value} hint={s.hint} size="lg" />
            ))}
          </div>
        )}
      </div>

      {/* Dashboard row 1 — price action and where this stock sits among peers. */}
      <div className={`mt-3 ${DASH_ROW}`}>
        {yearCloses.length >= 2 && (
          <Panel
            title="Closing price"
            meta="1M – 1Y · hover to inspect"
            className={SPAN_WIDE}
            bodyClassName="flex items-center p-2"
            flush
          >
            <StockPriceChart closes={yearCloses} />
          </Panel>
        )}

        {yearCloses.length >= 21 && (
          <Panel title="Analytics" meta="~1yr of closes" className={SPAN_SIDE} scroll>
            <StockAnalytics closes={yearCloses} />
          </Panel>
        )}

        {sectorPeers.length > 0 && (
          <Panel
            title="Sector peers"
            meta={sector}
            className={SPAN_SIDE}
            scroll
            flush
            footer={
              <Link href={sectorHref} className="text-panel-fg/68 hover:underline">
                See all {sectorRanked.length} in {sector} →
              </Link>
            }
          >
            <ul className="divide-y divide-panel-border">
              {sectorPeers.map((peer) => (
                <li key={peer.ticker}>
                  <Link
                    href={`/stocks/${peer.ticker}`}
                    className="flex items-center justify-between gap-2 px-3 py-1.5 text-xs hover:bg-panel-raised"
                  >
                    <span className="min-w-0 truncate">
                      <span className="font-mono font-semibold text-panel-fg">{peer.ticker}</span>
                      <span className="ml-2 text-panel-fg/70">{peer.companyName}</span>
                    </span>
                    <span className="flex shrink-0 items-baseline gap-2.5 tabular-nums">
                      <span className="text-panel-fg/80">{peer.price == null ? "N/A" : formatPeso(peer.price)}</span>
                      <span
                        className={`w-[52px] text-right ${(peer.pctChange ?? 0) >= 0 ? "text-up" : "text-down"}`}
                      >
                        {`${(peer.pctChange ?? 0) >= 0 ? "+" : ""}${(peer.pctChange ?? 0).toFixed(2)}%`}
                      </span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        )}
      </div>

      {/* Dashboard row 2 — the quantitative profile beside the two live feeds. */}
      <div className={`mt-3 ${DASH_ROW}`}>
        {statsSample != null && (
          <Panel
            title="Statistical profile"
            meta={`${statsSample} daily closes`}
            className={SPAN_WIDE}
            scroll
          >
            <StockStatistics closes={yearCloses} dividend={dividendSummary} />
          </Panel>
        )}

        <Panel
          title="Recent disclosures"
          meta={companyDisclosures.length > 0 ? `${companyDisclosures.length} filings` : undefined}
          className={SPAN_SIDE}
          scroll
          flush
          footer={
            <Link href="/disclosures" className="text-panel-fg/68 hover:underline">
              All disclosures →
            </Link>
          }
        >
          {companyDisclosures.length > 0 ? (
            <ul className="divide-y divide-panel-border">
              {companyDisclosures.map((d) => {
                const accent = DISCLOSURE_TYPE_ACCENT[d.type];
                return (
                  <li
                    key={d.referenceNo}
                    className="px-3 py-2 text-xs"
                    style={{ boxShadow: `inset 3px 0 0 ${accent}` }}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="type-badge truncate rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                        style={{ "--badge-accent": accent } as React.CSSProperties}
                      >
                        {DISCLOSURE_TYPE_LABELS[d.type]}
                      </span>
                      <span className="ml-auto shrink-0 text-[10.5px] text-panel-fg/72">
                        {formatRelative(d.filedAt)}
                      </span>
                    </div>
                    {d.url ? (
                      <a
                        href={d.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-0.5 block leading-snug text-panel-fg hover:underline"
                      >
                        {d.headline} <span aria-hidden="true">↗</span>
                      </a>
                    ) : (
                      <p className="mt-0.5 leading-snug text-panel-fg">{d.headline}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <PanelEmpty>No recent disclosures on record for {company.ticker}.</PanelEmpty>
          )}
        </Panel>

        <Panel
          title="In the news"
          meta={news.length > 0 ? `${news.length} mentions` : undefined}
          className={SPAN_SIDE}
          scroll
          flush
          footer={
            <Link href="/news" className="text-panel-fg/68 hover:underline">
              All PSE news →
            </Link>
          }
        >
          {news.length > 0 ? (
            <ul className="divide-y divide-panel-border">
              {news.map((item) => (
                <li key={item.url} className="px-3 py-2 text-xs">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block leading-snug text-panel-fg hover:underline"
                  >
                    {item.title}
                  </a>
                  <div className="mt-0.5 text-[10.5px] text-panel-fg/72">
                    {item.source} &middot; {formatRelative(item.publishedAt.toISOString())}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <PanelEmpty>No recent news mentions {company.ticker}.</PanelEmpty>
          )}
        </Panel>
      </div>

      {/* Below the fold: reference material rather than live market state. */}
      <div className="mt-3 flex flex-col items-stretch gap-3 lg:flex-row">
        {/* Capped only from `lg`: this row's panels stretch to match the tallest
            sibling (About), so unlike the rows above it needs an explicit
            desktop height for its body to have something to scroll within. */}
        {profile && (
          <Panel
            title={`About ${company.ticker}`}
            meta={profile.source}
            className="min-w-0 lg:basis-2/3 lg:grow-[2]"
            bodyClassName="flex flex-col gap-3"
          >
            {/* Block flow, not flex: CSS multi-column has no effect on a flex
                container, so `columns-2` silently did nothing when this was a
                `flex flex-col`. Paragraph spacing is margins for the same
                reason — `gap` doesn't apply here either. */}
            <div className="text-sm leading-snug text-panel-fg/80 [&>p]:mb-2 [&>p:last-child]:mb-0 sm:columns-2 sm:gap-5">
              {profile.description.split("\n\n").map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
            </div>

            {companyFacts.length > 0 && (
              <dl className="grid grid-cols-2 gap-x-5 gap-y-2 border-t border-panel-border pt-2.5 sm:grid-cols-3 xl:grid-cols-6">
                {companyFacts.map((f) => (
                  <div key={f.label} className="min-w-0">
                    <dt className="text-[10.5px] leading-tight text-panel-fg/60">{f.label}</dt>
                    <dd className="mt-0.5 text-xs leading-snug text-panel-fg/85">{f.value}</dd>
                  </div>
                ))}
              </dl>
            )}

            {profile.wikipediaSummary && (
              <div className="border-t border-panel-border pt-2.5">
                <p className="line-clamp-2 text-xs leading-snug text-panel-fg/65">{profile.wikipediaSummary}</p>
                {profile.wikipediaUrl && (
                  <a
                    href={profile.wikipediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block text-[11px] text-panel-fg/60 hover:underline"
                  >
                    {profile.wikipediaTitle} on Wikipedia →
                  </a>
                )}
              </div>
            )}
          </Panel>
        )}

        <Panel
          title="Balance sheet & income statement"
          meta="PSE Edge · Annual"
          className="min-w-0 lg:max-h-[26rem] lg:basis-1/3 lg:grow"
          scroll
        >
          {hasFinancials ? (
            <CompanyFinancials data={companyFinancials!} />
          ) : (
            <PanelEmpty>No annual financial report on file for {company.ticker} yet.</PanelEmpty>
          )}
        </Panel>
      </div>

      {profile && hasAnyLeadershipData(profile.boardOfDirectors, profile.managementOfficers) && (
        <div className="mt-3">
          <Panel title="Board of directors & management" meta="PSE Edge" className="lg:max-h-[26rem]" scroll>
            <CompanyLeadership
              boardOfDirectors={profile.boardOfDirectors}
              managementOfficers={profile.managementOfficers}
            />
          </Panel>
        </div>
      )}

      {yearCloses.length >= 31 && (
        <div className="mt-3">
          <Panel title="Seasonality" meta="average return by calendar month">
            <StockSeasonality closes={yearCloses} />
          </Panel>
        </div>
      )}

      <div className="mt-4">
        <RecentlyViewed excludeTicker={ticker} />
      </div>

      <p className="mt-4 text-xs text-panel-fg/72">
        Delayed/EOD data, not real-time. Figures are statistics on past closing prices, not a
        forecast, stock pick, or buy/sell signal, and not financial advice.
      </p>
    </div>
  );
}
