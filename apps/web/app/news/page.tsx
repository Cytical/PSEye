import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import type { NewsItem } from "@pseye/source-news";
import { fetchNewsProgressive, getNewsInsights, type NewsMoodSummary, type TrendingTicker } from "@/lib/news";
import { NewsCard } from "@/components/NewsCard";
import {
  NewsFrontSkeleton,
  NewsMoreSkeleton,
  NewsMoodSkeleton,
  TrendingTickersSkeleton,
} from "@/components/NewsSkeleton";
import { newsSerif, newsSans } from "./fonts";

// Hourly ISR check — just an upper bound on how stale a cached render can be.
// The underlying data only actually changes once/day (fetch-daily.yml runs
// news via the shared daily ETL job, not a dedicated hourly one).
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "PSE Stock Market News — PH Business Headlines",
  description: "The most relevant PH business headlines, auto-tagged by PSE ticker.",
  alternates: { canonical: "/news" },
};

export default function NewsPage() {
  // Kicked off here (not awaited) so both tiers fetch in parallel; each
  // Suspense boundary below awaits only the slice it needs.
  const { top, rest } = fetchNewsProgressive();

  // Same "kick off once, let each Suspense boundary await its own slice"
  // shape — mood and trending share one underlying query (getNewsInsights)
  // rather than each independently reading the DB.
  const insights = getNewsInsights();
  const mood = insights.then((i) => i.mood);
  const trending = insights.then((i) => i.trending);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    // FT-paper background: pale salmon/pink in light mode, a warm (not cold)
    // near-black charcoal in dark mode — the palette is scoped to this route
    // only via arbitrary-value classes, same scoping principle as the fonts
    // below, rather than touching globals.css's site-wide tokens. The bg
    // lives on this outer, unconstrained-width div (not the inner max-w one)
    // so it fills `main`'s full width edge-to-edge like a real front page.
    <div className={`${newsSerif.variable} ${newsSans.variable} bg-[#FFF1E5] dark:bg-[#14100E]`}>
      <div className="mx-auto max-w-[1536px] px-4 py-8 text-[#1A1210] sm:px-6 dark:text-[#F2E9E2]">
        <header className="border-b-4 border-[#990F3D] pb-3 dark:border-[#D75980]">
          <p className="font-news-sans text-xs font-semibold uppercase tracking-[0.14em] text-[#1A1210]/60 dark:text-[#F2E9E2]/60">
            {today}
          </p>
          <h1 className="font-news-serif mt-1 text-4xl font-bold tracking-tight sm:text-5xl">
            Markets News
          </h1>
          <p className="font-news-sans mt-2 text-sm text-[#1A1210]/70 dark:text-[#F2E9E2]/70">
            The most relevant headlines, ranked by relevance to PSE-listed companies and linked
            back to the original outlet.
          </p>
          <a
            href="/feed.xml"
            className="font-news-sans mt-2 inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-[#990F3D] hover:underline dark:text-[#D75980]"
          >
            RSS feed
          </a>
        </header>

        <div className="mt-5">
          <Suspense fallback={<NewsMoodSkeleton />}>
            <MarketMood moodPromise={mood} />
          </Suspense>
        </div>

        <div className="mt-8">
          <Suspense fallback={<NewsFrontSkeleton />}>
            <FrontPage itemsPromise={top} />
          </Suspense>
        </div>

        <div className="mt-14 lg:grid lg:grid-cols-4 lg:gap-10">
          <div className="lg:col-span-3">
            <h2 className="font-news-sans border-b-2 border-[#990F3D] pb-2 text-sm font-bold uppercase tracking-[0.12em] dark:border-[#D75980]">
              More Headlines
            </h2>
            <Suspense fallback={<NewsMoreSkeleton />}>
              <MoreHeadlines itemsPromise={rest} />
            </Suspense>
          </div>

          <div className="mt-10 lg:mt-0 lg:col-span-1 lg:border-l lg:border-[#1A1210]/15 lg:pl-8 lg:dark:border-[#F2E9E2]/15">
            <Suspense fallback={<TrendingTickersSkeleton />}>
              <TrendingTickersRail trendingPromise={trending} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Aggregate headline sentiment (see scoreSentiment in
 * packages/sources/news/src/sentiment.ts and computeMoodSummary in
 * lib/news.ts) — same breadth-strip spirit as the daily recap's
 * advancers/decliners/unchanged count, just for tone instead of price. Same
 * green=up/red=down convention as the rest of the site (text-up/text-down/
 * bg-up/bg-down, from --up/--down in globals.css).
 */
async function MarketMood({ moodPromise }: { moodPromise: Promise<NewsMoodSummary> }) {
  const mood = await moodPromise;
  if (mood.total === 0) return null;

  const positivePct = Math.round((mood.positive / mood.total) * 100);
  const negativePct = Math.round((mood.negative / mood.total) * 100);
  const neutralPct = Math.max(0, 100 - positivePct - negativePct);

  return (
    <div className="border-y border-[#1A1210]/10 py-3 dark:border-[#F2E9E2]/10">
      <p className="font-news-sans text-[11px] font-bold uppercase tracking-[0.12em] text-[#1A1210]/60 dark:text-[#F2E9E2]/60">
        Market Mood
      </p>
      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="font-news-sans text-sm font-bold tabular-nums text-up">{positivePct}% Positive</span>
        <span className="font-news-sans text-sm font-bold tabular-nums text-down">{negativePct}% Negative</span>
        <span className="font-news-sans text-sm font-semibold tabular-nums text-[#1A1210]/55 dark:text-[#F2E9E2]/55">
          {neutralPct}% Neutral
        </span>
        <span className="font-news-sans text-[11px] text-[#1A1210]/40 dark:text-[#F2E9E2]/40">
          across {mood.total} recent headlines
        </span>
      </div>
      <div className="mt-2 flex h-1.5 w-full max-w-md overflow-hidden rounded-full bg-[#1A1210]/10 dark:bg-[#F2E9E2]/10">
        {mood.positive > 0 && <div className="h-full bg-up" style={{ width: `${positivePct}%` }} />}
        {mood.negative > 0 && <div className="h-full bg-down" style={{ width: `${negativePct}%` }} />}
      </div>
    </div>
  );
}

/**
 * "Most mentioned today" — see computeTrendingTickers in lib/news.ts.
 * Cross-links to /stocks/[ticker], mirroring that page's own "In the news"
 * section which links the other direction.
 */
async function TrendingTickersRail({ trendingPromise }: { trendingPromise: Promise<TrendingTicker[]> }) {
  const trending = await trendingPromise;
  if (trending.length === 0) return null;

  return (
    <div>
      <h2 className="font-news-sans border-b-2 border-[#990F3D] pb-2 text-sm font-bold uppercase tracking-[0.12em] dark:border-[#D75980]">
        Trending Tickers
      </h2>
      <ol className="mt-4 flex flex-col gap-3.5">
        {trending.map((t, i) => (
          <li key={t.ticker}>
            <Link
              href={`/stocks/${t.ticker}`}
              className="group flex items-center justify-between gap-3 font-news-sans"
            >
              <span className="flex min-w-0 items-center gap-2.5">
                <span className="w-4 shrink-0 text-right font-mono text-[11px] text-[#1A1210]/35 dark:text-[#F2E9E2]/35">
                  {i + 1}
                </span>
                <span className="truncate text-sm font-bold tracking-tight text-[#1A1210] group-hover:underline dark:text-[#F2E9E2]">
                  {t.ticker}
                </span>
              </span>
              <span className="shrink-0 text-[11px] text-[#1A1210]/45 dark:text-[#F2E9E2]/45">
                {t.count} mention{t.count === 1 ? "" : "s"}
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}

async function FrontPage({ itemsPromise }: { itemsPromise: Promise<NewsItem[]> }) {
  const items = await itemsPromise;

  if (items.length === 0) {
    return (
      <p className="font-news-sans text-sm text-[#1A1210]/50 dark:text-[#F2E9E2]/50">
        No items fetched yet — outlet feeds may be unreachable from this environment, or none
        matched. See packages/sources/news/src/outlets.ts.
      </p>
    );
  }

  const [hero, ...secondary] = items;

  // Cites the outlets' own articles (headline/url/date/publisher only, no
  // body content claimed as ours) — same "accurate or not at all" standard
  // as layout.tsx's site-wide JSON-LD comment. Only covers the front-page
  // tier since that's what's available synchronously here; "More Headlines"
  // streams in separately below.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: item.url,
      item: {
        "@type": "NewsArticle",
        headline: item.title,
        url: item.url,
        datePublished: item.publishedAt.toISOString(),
        publisher: { "@type": "Organization", name: item.source },
      },
    })),
  };

  return (
    <div className="grid grid-cols-1 gap-10 lg:grid-cols-3">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="lg:col-span-2">
        <NewsCard item={hero} variant="hero" />
      </div>
      {secondary.length > 0 && (
        <div className="flex flex-col lg:col-span-1 lg:border-l lg:border-[#1A1210]/15 lg:pl-8 lg:dark:border-[#F2E9E2]/15">
          {secondary.map((item) => (
            <div
              key={item.url}
              className="border-t border-[#1A1210]/10 py-6 first:border-t-0 first:pt-0 dark:border-[#F2E9E2]/10"
            >
              <NewsCard item={item} variant="secondary" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

async function MoreHeadlines({ itemsPromise }: { itemsPromise: Promise<NewsItem[]> }) {
  const items = await itemsPromise;

  if (items.length === 0) return null;

  return (
    <ul className="mt-5 grid grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-2">
      {items.map((item) => (
        <li key={item.url} className="border-b border-[#1A1210]/10 pb-5 dark:border-[#F2E9E2]/10">
          <NewsCard item={item} variant="compact" />
        </li>
      ))}
    </ul>
  );
}
