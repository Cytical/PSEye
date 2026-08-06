import { Suspense } from "react";
import Link from "next/link";
import type { Metadata } from "next";
import type { NewsCluster } from "@pseye/source-news";
import { topicToSlug } from "@pseye/source-news";
import {
  getNewsPageData,
  DESK_PREVIEW_COUNT,
  type CompanyMention,
  type DeskCount,
  type MarketReactions,
  type NewsMoodSummary,
  type NewsSection,
} from "@/lib/news";
import { NewsCard } from "@/components/NewsCard";
import { NewsDeskNav } from "@/components/NewsDeskNav";
import {
  NewsFrontSkeleton,
  NewsLatestSkeleton,
  NewsMoreSkeleton,
  NewsMoodSkeleton,
} from "@/components/NewsSkeleton";
import { newsSerif, newsSans } from "./fonts";

export const revalidate = 21600; // 6h safety-net ceiling; real refresh is on-demand via revalidateTag/revalidatePath from the ETL jobs (see app/api/revalidate/route.ts) — the wall-clock value only kicks in if that call ever fails.

export const metadata: Metadata = {
  title: "PSE Stock Market News: PH Business Headlines",
  description: "The most relevant PH business headlines, auto-tagged by PSE ticker.",
  alternates: { canonical: "/news" },
};

export default function NewsPage() {
  // Kicked off here (not awaited) so every slice resolves off one shared DB
  // read (see getNewsPageData); each Suspense boundary below awaits only what
  // it needs.
  const { top, latest, sections, mood, reactions, mostMentioned, desks } = getNewsPageData();

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
      {/* 1400 rather than the 1536 this started at. A section front is read in
          columns, and at 1536 the three-across desk grid ran past the width a
          serif headline stays comfortable at. */}
      <div className="mx-auto max-w-[1400px] px-4 pb-16 text-[#1A1210] sm:px-6 dark:text-[#F2E9E2]">
        <header className="pt-8">
          <p className="font-news-sans text-[11px] font-semibold uppercase tracking-[0.16em] text-[#990F3D] dark:text-[#D75980]">
            {today}
          </p>
          <div className="mt-1 flex flex-wrap items-end justify-between gap-x-8 gap-y-2">
            <h1 className="font-news-serif text-4xl font-bold leading-none tracking-tight sm:text-5xl">
              Markets News
            </h1>
            <p className="font-news-sans max-w-md text-[13px] leading-snug text-[#1A1210]/65 dark:text-[#F2E9E2]/65">
              PH business headlines from eight outlets, filed to a desk, deduplicated across
              mastheads, and tagged with what the stock actually did today.
            </p>
          </div>
        </header>

        <Suspense
          fallback={<div className="mt-4 h-11 border-y border-[#1A1210]/12 dark:border-[#F2E9E2]/12" />}
        >
          <DeskNav desksPromise={desks} />
        </Suspense>

        <Suspense fallback={<NewsMoodSkeleton />}>
          <MarketPulse moodPromise={mood} mentionsPromise={mostMentioned} reactionsPromise={reactions} />
        </Suspense>

        <div className="mt-8">
          <Suspense fallback={<NewsFrontSkeleton />}>
            <FrontPage storiesPromise={top} reactionsPromise={reactions} />
          </Suspense>
        </div>

        <Suspense fallback={<NewsLatestSkeleton />}>
          <LatestStrip storiesPromise={latest} reactionsPromise={reactions} />
        </Suspense>

        <Suspense fallback={<NewsMoreSkeleton />}>
          <SectionFronts
            sectionsPromise={sections}
            reactionsPromise={reactions}
            featuredPromise={top}
          />
        </Suspense>
      </div>
    </div>
  );
}

async function DeskNav({ desksPromise }: { desksPromise: Promise<DeskCount[]> }) {
  return <NewsDeskNav desks={await desksPromise} />;
}

/**
 * The band under the desk nav: aggregate headline sentiment on the left, the
 * companies this week's coverage is about on the right.
 *
 * These were two stacked full-width strips of small text, which on a page
 * whose complaint was density meant two rows spent before the first story.
 * Side by side they occupy one row and read as a single "state of the market"
 * summary, which is what they always were.
 */
async function MarketPulse({
  moodPromise,
  mentionsPromise,
  reactionsPromise,
}: {
  moodPromise: Promise<NewsMoodSummary>;
  mentionsPromise: Promise<CompanyMention[]>;
  reactionsPromise: Promise<MarketReactions>;
}) {
  const [mood, mentions, reactions] = await Promise.all([
    moodPromise,
    mentionsPromise,
    reactionsPromise,
  ]);
  if (mood.total === 0) return null;

  const positivePct = Math.round((mood.positive / mood.total) * 100);
  const negativePct = Math.round((mood.negative / mood.total) * 100);
  const neutralPct = Math.max(0, 100 - positivePct - negativePct);

  return (
    <div className="mt-5 grid gap-x-10 gap-y-5 border-b border-[#1A1210]/12 pb-5 lg:grid-cols-[minmax(0,22rem)_1fr] dark:border-[#F2E9E2]/12">
      <div>
        <p className="font-news-sans text-[10px] font-bold uppercase tracking-[0.14em] text-[#1A1210]/55 dark:text-[#F2E9E2]/55">
          Headline tone
        </p>
        {/* One stacked bar carrying all three shares, with the numbers read
            off it, rather than three separate percentages above a bar that
            only encoded two of them. */}
        <div className="mt-2 flex h-2 w-full overflow-hidden rounded-full bg-[#1A1210]/10 dark:bg-[#F2E9E2]/10">
          {mood.positive > 0 && <div className="h-full bg-up" style={{ width: `${positivePct}%` }} />}
          {mood.negative > 0 && <div className="h-full bg-down" style={{ width: `${negativePct}%` }} />}
        </div>
        <div className="font-news-sans mt-2 flex flex-wrap items-baseline gap-x-3 text-[12px] tabular-nums">
          <span className="font-bold text-up">{positivePct}% positive</span>
          <span className="font-bold text-down">{negativePct}% negative</span>
          {/* /65 rather than the /55 this started at: on this route's paper
              background (#FFF1E5) /55 measured 3.96:1, under the 4.5:1 AA
              floor. /65 reads 5.45:1 and still sits quieter than the figures. */}
          <span className="font-semibold text-[#1A1210]/65 dark:text-[#F2E9E2]/65">
            {neutralPct}% neutral
          </span>
          <span className="text-[11px] text-[#1A1210]/55 dark:text-[#F2E9E2]/55">
            across {mood.total} headlines
          </span>
        </div>
      </div>

      {mentions.length > 0 && (
        <div>
          <p className="font-news-sans text-[10px] font-bold uppercase tracking-[0.14em] text-[#1A1210]/55 dark:text-[#F2E9E2]/55">
            Most covered companies
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {mentions.map(({ ticker, stories }) => {
              const move = reactions.get(ticker);
              return (
                <Link
                  key={ticker}
                  href={`/stocks/${ticker}`}
                  className="font-news-sans flex items-baseline gap-1.5 rounded-sm border border-[#1A1210]/15 px-2 py-1 text-[11px] transition-colors hover:border-[#990F3D] hover:bg-[#990F3D]/5 dark:border-[#F2E9E2]/15 dark:hover:border-[#D75980] dark:hover:bg-[#D75980]/10"
                >
                  <span className="font-mono text-[12px] font-bold">{ticker}</span>
                  {typeof move === "number" && (
                    <span
                      className={`font-mono font-semibold tabular-nums ${
                        move > 0 ? "text-up" : move < 0 ? "text-down" : ""
                      }`}
                    >
                      {move > 0 ? "+" : ""}
                      {move.toFixed(2)}%
                    </span>
                  )}
                  <span className="text-[#1A1210]/55 dark:text-[#F2E9E2]/55">{stories} stories</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

async function FrontPage({
  storiesPromise,
  reactionsPromise,
}: {
  storiesPromise: Promise<NewsCluster[]>;
  reactionsPromise: Promise<MarketReactions>;
}) {
  const [stories, reactions] = await Promise.all([storiesPromise, reactionsPromise]);

  if (stories.length === 0) {
    return (
      <p className="font-news-sans text-sm text-[#1A1210]/65 dark:text-[#F2E9E2]/65">
        No items yet. Feeds may be unreachable from this environment, or nothing matched. See
        packages/sources/news/src/outlets.ts.
      </p>
    );
  }

  const [hero, ...secondary] = stories;

  // Cites the outlets' own articles (headline/url/date/publisher only, no
  // body content claimed as ours) — same "accurate or not at all" standard
  // as layout.tsx's site-wide JSON-LD comment. Only covers the front-page
  // tier since that's what's available synchronously here; the desks stream
  // in separately below. Lists the lead of each cluster, since that is what
  // the page actually renders as a story.
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
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
    // 7/12 and 5/12, not 2/3 and 1/3: at this container width a two-thirds
    // hero image cleared 550px tall and pushed every other story off the
    // first screen.
    <div className="grid grid-cols-1 gap-x-10 gap-y-10 lg:grid-cols-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="lg:col-span-7">
        <NewsCard story={hero} variant="hero" reactions={reactions} />
      </div>
      {secondary.length > 0 && (
        <div className="flex flex-col lg:col-span-5 lg:border-l lg:border-[#1A1210]/15 lg:pl-10 lg:dark:border-[#F2E9E2]/15">
          {secondary.map((story) => (
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
  );
}

/**
 * The four most recent stories, in the order they were filed.
 *
 * The only strictly chronological block on the page. Everything else is
 * ranked (ticker-tagged stories first, see rankByRelevance) or grouped by
 * subject, so without this there is nowhere a reader can simply ask "what has
 * come in". Image-forward and one line of lede each, to break up the run of
 * text between the front page and the directory below it.
 */
async function LatestStrip({
  storiesPromise,
  reactionsPromise,
}: {
  storiesPromise: Promise<NewsCluster[]>;
  reactionsPromise: Promise<MarketReactions>;
}) {
  const [stories, reactions] = await Promise.all([storiesPromise, reactionsPromise]);
  if (stories.length === 0) return null;

  return (
    <section className="mt-12 border-t-2 border-[#1A1210]/85 pt-3 dark:border-[#F2E9E2]/70">
      <h2 className="font-news-sans text-[15px] font-bold uppercase tracking-[0.1em]">
        Latest
      </h2>
      <ul className="mt-5 grid grid-cols-1 gap-x-8 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
        {stories.map((story) => (
          <li key={story.lead.url}>
            <NewsCard story={story} variant="lead" reactions={reactions} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Every desk, three headlines each, linking on to the desk's own page.
 *
 * A directory, not a set of section fronts. Printing each desk's full run
 * here is what the /news/[topic] pages now exist to take over: eleven desks
 * rendered as preview blocks measured *longer* than the flat thirty-six-card
 * grid this redesign started from, because uncapping the corpus surfaced
 * every desk at once. Three ledeless headlines under a named heading says
 * what a desk is about today in about two inches, and a reader who wants the
 * rest of it clicks through.
 */
async function SectionFronts({
  sectionsPromise,
  reactionsPromise,
  featuredPromise,
}: {
  sectionsPromise: Promise<NewsSection[]>;
  reactionsPromise: Promise<MarketReactions>;
  featuredPromise: Promise<NewsCluster[]>;
}) {
  const [sections, reactions, featured] = await Promise.all([
    sectionsPromise,
    reactionsPromise,
    featuredPromise,
  ]);
  if (sections.length === 0) return null;

  // The desk counts stay whole (they have to agree with the nav and with each
  // desk's own page), but the headlines already sitting at the top of this
  // same page are skipped here rather than printed twice.
  const onFrontPage = new Set(featured.map((c) => c.lead.url));

  return (
    <section className="mt-12">
      <div className="flex items-baseline justify-between gap-4 border-t-2 border-[#1A1210]/85 pt-3 dark:border-[#F2E9E2]/70">
        <h2 className="font-news-sans text-[15px] font-bold uppercase tracking-[0.1em]">
          Browse by desk
        </h2>
        <span className="font-news-sans text-[11px] text-[#1A1210]/55 dark:text-[#F2E9E2]/55">
          {sections.length} desks
        </span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-x-10 gap-y-9 sm:grid-cols-2 lg:grid-cols-3">
        {sections.map((section) => {
          const slug = topicToSlug(section.topic);
          const shown = section.stories
            .filter((story) => !onFrontPage.has(story.lead.url))
            .slice(0, DESK_PREVIEW_COUNT);
          const remaining = section.stories.length - shown.length;
          if (shown.length === 0) return null;

          return (
            <div key={section.topic}>
              <Link
                href={`/news/${slug}`}
                className="group flex items-baseline justify-between gap-3 border-b border-[#990F3D] pb-1.5 dark:border-[#D75980]"
              >
                <h3 className="font-news-sans text-[12px] font-bold uppercase tracking-[0.1em] text-[#990F3D] group-hover:underline dark:text-[#D75980]">
                  {section.topic}
                </h3>
                <span className="font-mono text-[10px] tabular-nums text-[#1A1210]/50 dark:text-[#F2E9E2]/50">
                  {section.stories.length}
                </span>
              </Link>

              <ul className="mt-3 space-y-3">
                {shown.map((story) => (
                  <li
                    key={story.lead.url}
                    className="border-t border-[#1A1210]/10 pt-3 first:border-t-0 first:pt-0 dark:border-[#F2E9E2]/10"
                  >
                    <NewsCard story={story} variant="headline" reactions={reactions} />
                  </li>
                ))}
              </ul>

              {remaining > 0 && (
                <Link
                  href={`/news/${slug}`}
                  className="font-news-sans mt-3 inline-block text-[11px] font-semibold uppercase tracking-[0.08em] text-[#1A1210]/70 hover:text-[#990F3D] dark:text-[#F2E9E2]/70 dark:hover:text-[#D75980]"
                >
                  {remaining} more<span aria-hidden> &rarr;</span>
                  <span className="sr-only"> in {section.topic}</span>
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
