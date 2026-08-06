import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NEWS_DESKS, slugToTopic, topicToSlug, type NewsCluster, type NewsDesk } from "@pseye/source-news";
import { getTopicPageData, type DeskCount, type MarketReactions } from "@/lib/news";
import { NewsCard } from "@/components/NewsCard";
import { NewsDeskNav } from "@/components/NewsDeskNav";
import { NewsDeskSkeleton } from "@/components/NewsSkeleton";
import { newsSerif, newsSans } from "../fonts";

export const revalidate = 21600; // Same 6h safety-net ceiling as /news; the real refresh is the on-demand revalidateTag("news") the news ETL fires (see app/api/revalidate/route.ts).

/**
 * One page per desk, so the front page can preview instead of printing
 * everything. Statically enumerated: the desk list is a compile-time constant
 * (NEWS_DESKS), not data, so there is no reason to leave these to be
 * discovered at request time.
 */
export function generateStaticParams() {
  return NEWS_DESKS.map((topic) => ({ topic: topicToSlug(topic) }));
}

/** Everything but the desk name is fixed copy; this is what makes each desk
 * page a distinct indexable document rather than eleven near-identical ones. */
const DESK_BLURBS: Record<NewsDesk, string> = {
  Earnings: "Results season on the PSE: quarterly and full-year profit reports from listed companies, with what each stock did on the day.",
  Markets: "PSEi moves, share offerings, block sales, buybacks and deals across Philippine listed equities.",
  "Banking & Finance": "Bangko Sentral policy, lending and deposits, insurers, digital banks and fintech in the Philippines.",
  "Energy & Power": "Meralco and the grid, generation capacity, fuel prices, renewables and ERC rulings.",
  Property: "Philippine real estate: developers, townships, office and residential supply, REITs and leasing.",
  Consumer: "Retail, food and beverage, tourism, airlines and agriculture across the Philippine consumer economy.",
  Infrastructure: "Roads, rail, airports, ports, water and the public-private partnerships behind them.",
  "Telecom & Tech": "PLDT, Globe, Converge and DITO, plus data centers, semiconductors and the digital economy.",
  Mining: "Nickel, copper and gold: Philippine mining output, permits, prices and the companies behind them.",
  Economy: "Inflation, GDP, trade, jobs, the peso, taxes and tariffs shaping the Philippine economy.",
  "General Business": "Philippine business headlines that do not sit on one of the named desks.",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ topic: string }>;
}): Promise<Metadata> {
  const { topic: slug } = await params;
  const topic = slugToTopic(slug);
  if (!topic) return {};

  return {
    title: `${topic} News: Philippine Stock Market`,
    description: DESK_BLURBS[topic],
    alternates: { canonical: `/news/${topicToSlug(topic)}` },
  };
}

export default async function NewsTopicPage({ params }: { params: Promise<{ topic: string }> }) {
  const { topic: slug } = await params;
  const topic = slugToTopic(slug);
  if (!topic) notFound();

  const { stories, reactions, desks } = getTopicPageData(topic);

  return (
    <div className={`${newsSerif.variable} ${newsSans.variable} bg-[#FFF1E5] dark:bg-[#14100E]`}>
      <div className="mx-auto max-w-[1400px] px-4 pb-16 text-[#1A1210] sm:px-6 dark:text-[#F2E9E2]">
        <header className="pt-8">
          <nav aria-label="Breadcrumb">
            <Link
              href="/news"
              className="font-news-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[#990F3D] hover:underline dark:text-[#D75980]"
            >
              <span aria-hidden>&larr; </span>Markets News
            </Link>
          </nav>
          <h1 className="font-news-serif mt-1 text-4xl font-bold leading-none tracking-tight sm:text-5xl">
            {topic}
          </h1>
          <p className="font-news-sans mt-2 max-w-2xl text-[13.5px] leading-snug text-[#1A1210]/65 dark:text-[#F2E9E2]/65">
            {DESK_BLURBS[topic]}
          </p>
        </header>

        <Suspense
          fallback={<div className="mt-4 h-11 border-y border-[#1A1210]/12 dark:border-[#F2E9E2]/12" />}
        >
          <DeskNav desksPromise={desks} current={topic} />
        </Suspense>

        <Suspense fallback={<NewsDeskSkeleton />}>
          <DeskStories topic={topic} storiesPromise={stories} reactionsPromise={reactions} />
        </Suspense>
      </div>
    </div>
  );
}

async function DeskNav({
  desksPromise,
  current,
}: {
  desksPromise: Promise<DeskCount[]>;
  current: NewsDesk;
}) {
  return <NewsDeskNav desks={await desksPromise} current={current} />;
}

/** How many stories get a full card before the desk switches to a headline
 * list. One lead plus a six-card grid fills two rows at every breakpoint; past
 * that the page is back to being the wall of ledes this redesign broke up. */
const FULL_CARD_COUNT = 7;

async function DeskStories({
  topic,
  storiesPromise,
  reactionsPromise,
}: {
  topic: NewsDesk;
  storiesPromise: Promise<NewsCluster[]>;
  reactionsPromise: Promise<MarketReactions>;
}) {
  const [stories, reactions] = await Promise.all([storiesPromise, reactionsPromise]);

  if (stories.length === 0) {
    return (
      <p className="font-news-sans mt-10 text-sm text-[#1A1210]/65 dark:text-[#F2E9E2]/65">
        Nothing filed to this desk in the last seven days.{" "}
        <Link href="/news" className="underline hover:text-[#990F3D] dark:hover:text-[#D75980]">
          Back to the front page
        </Link>
        .
      </p>
    );
  }

  const [hero, ...rest] = stories;
  const featured = rest.slice(0, FULL_CARD_COUNT - 1);
  const remainder = rest.slice(FULL_CARD_COUNT - 1);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${topic} news, Philippine Stock Exchange`,
    itemListElement: stories.map(({ lead }, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: lead.url,
      item: {
        "@type": "NewsArticle",
        headline: lead.title,
        url: lead.url,
        datePublished: lead.publishedAt.toISOString(),
        publisher: { "@type": "Organization", name: lead.source },
        ...(lead.author ? { author: { "@type": "Person", name: lead.author } } : {}),
      },
    })),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="mt-8 grid grid-cols-1 gap-x-10 gap-y-10 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <NewsCard story={hero} variant="hero" reactions={reactions} />
        </div>
        {featured.length > 0 && (
          <div className="flex flex-col lg:col-span-5 lg:border-l lg:border-[#1A1210]/15 lg:pl-10 lg:dark:border-[#F2E9E2]/15">
            {featured.slice(0, 3).map((story) => (
              <div
                key={story.lead.url}
                className="border-t border-[#1A1210]/10 py-5 first:border-t-0 first:pt-0 dark:border-[#F2E9E2]/10"
              >
                <NewsCard story={story} variant="secondary" reactions={reactions} />
              </div>
            ))}
          </div>
        )}
      </div>

      {featured.length > 3 && (
        <ul className="mt-10 grid grid-cols-1 gap-x-10 gap-y-7 border-t border-[#1A1210]/12 pt-8 sm:grid-cols-2 lg:grid-cols-3 dark:border-[#F2E9E2]/12">
          {featured.slice(3).map((story) => (
            <li key={story.lead.url}>
              <NewsCard story={story} variant="compact" reactions={reactions} />
            </li>
          ))}
        </ul>
      )}

      {remainder.length > 0 && (
        <section className="mt-12">
          <h2 className="font-news-sans border-t-2 border-[#1A1210]/85 pt-3 text-[15px] font-bold uppercase tracking-[0.1em] dark:border-[#F2E9E2]/70">
            More in {topic}
            <span className="ml-2 font-mono text-[11px] font-normal tabular-nums opacity-55">
              {remainder.length}
            </span>
          </h2>
          {/* Headline-only from here down. A reader this far into one desk is
              scanning for a specific story, not browsing, and a ledeless list
              is what a scan wants. */}
          <ul className="mt-5 grid grid-cols-1 gap-x-10 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            {remainder.map((story) => (
              <li
                key={story.lead.url}
                className="border-t border-[#1A1210]/10 pt-4 dark:border-[#F2E9E2]/10"
              >
                <NewsCard story={story} variant="headline" reactions={reactions} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
