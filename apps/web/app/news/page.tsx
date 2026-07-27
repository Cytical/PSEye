import { Suspense } from "react";
import type { Metadata } from "next";
import type { NewsItem } from "@pseye/source-news";
import { fetchNewsProgressive } from "@/lib/news";
import { NewsCard } from "@/components/NewsCard";
import { NewsFrontSkeleton, NewsMoreSkeleton } from "@/components/NewsSkeleton";
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
    <ul className="mt-5 grid grid-cols-1 gap-x-10 gap-y-6 sm:grid-cols-2 xl:grid-cols-3">
      {items.map((item) => (
        <li key={item.url} className="border-b border-[#1A1210]/10 pb-5 dark:border-[#F2E9E2]/10">
          <NewsCard item={item} variant="compact" />
        </li>
      ))}
    </ul>
  );
}
