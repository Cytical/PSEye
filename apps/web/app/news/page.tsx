import { Suspense } from "react";
import type { Metadata } from "next";
import type { NewsItem } from "@pseye/source-news";
import { getNewsPageData, type NewsMoodSummary } from "@/lib/news";
import { NewsCard } from "@/components/NewsCard";
import { NewsFrontSkeleton, NewsMoreSkeleton, NewsMoodSkeleton } from "@/components/NewsSkeleton";
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
  // Kicked off here (not awaited) so top/rest/mood all fetch in parallel off
  // one shared DB read (see getNewsPageData); each Suspense boundary below
  // awaits only the slice it needs.
  const { top, rest, mood } = getNewsPageData();

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

        <div className="mt-14">
          <h2 className="font-news-sans border-b-2 border-[#990F3D] pb-2 text-sm font-bold uppercase tracking-[0.12em] dark:border-[#D75980]">
            More Headlines
          </h2>
          <Suspense fallback={<NewsMoreSkeleton />}>
            <MoreHeadlines itemsPromise={rest} />
          </Suspense>
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
        {/* /65 and /60 rather than the /55 and /40 these started at: on this
            route's FT-paper background (#FFF1E5) those measured 3.96:1 and
            2.58:1, under the 4.5:1 AA floor. /65 (5.45:1) and /60 (4.70:1)
            clear it while keeping the caption quieter than the figure. */}
        <span className="font-news-sans text-sm font-semibold tabular-nums text-[#1A1210]/65 dark:text-[#F2E9E2]/65">
          {neutralPct}% Neutral
        </span>
        <span className="font-news-sans text-[11px] text-[#1A1210]/60 dark:text-[#F2E9E2]/60">
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

async function FrontPage({ itemsPromise }: { itemsPromise: Promise<NewsItem[]> }) {
  const items = await itemsPromise;

  if (items.length === 0) {
    return (
      <p className="font-news-sans text-sm text-[#1A1210]/65 dark:text-[#F2E9E2]/65">
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
    <ul className="mt-5 grid grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <li key={item.url} className="border-b border-[#1A1210]/10 pb-5 dark:border-[#F2E9E2]/10">
          <NewsCard item={item} variant="compact" />
        </li>
      ))}
    </ul>
  );
}
