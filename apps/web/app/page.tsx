import type { Metadata } from "next";
import { getDailyQuotes } from "@/lib/quotes";
import { getCompanyProfiles } from "@/lib/companyProfiles";
import { getMarketSnapshot } from "@/lib/marketSnapshot";
import { getLatestForeignFlow } from "@/lib/latestForeignFlow";
import { getRealSparklines } from "@/lib/sparklines";
import { getRecentRecapDates } from "@/lib/dailyRecap";
import { manilaToday } from "@/lib/manilaDate";
import { MarketMap } from "@/components/MarketMap";
import { MarketMapFaq } from "@/components/MarketMapFaq";
import { getMarketStatus } from "@/lib/marketStatus";

export const revalidate = 21600; // 6h safety-net ceiling; real refresh is on-demand via revalidateTag/revalidatePath from the ETL jobs (see app/api/revalidate/route.ts) — the wall-clock value only kicks in if that call ever fails.

export const metadata: Metadata = {
  title: "PSE Market Map: Live PSEi Heatmap",
  description:
    "Live heatmap of the Philippine Stock Exchange (PSE): every PSEi stock sized by market cap and colored by today's % change, grouped by sector. Free, no login.",
  alternates: { canonical: "/" },
};

// Genuine, low-maintenance Q&A — gives the otherwise canvas-only homepage
// crawlable keyword text and can win a "People also ask" result via FAQPage.
// Leads with "how do I read this" — the one question an unfamiliar
// first-time visitor actually has in front of a treemap, before any
// trust/pricing/coverage questions.
const FAQ = [
  {
    q: "How do I read the market map?",
    a: "Each box is a listed company, sized by market cap and colored by today's price change: green for up, red for down. A deeper shade means a bigger move. Boxes are grouped into panels by PSE sector, so you can see which parts of the market are leading or lagging at a glance.",
  },
  {
    q: "I'm new to investing: how do I actually buy a stock?",
    a: "PSEye is a tracker, not a brokerage, so it can't place an order for you. You'd open an account with a PSE-accredited stockbroker, then buy in whole board lots through their platform.",
    href: "/getting-started",
    hrefLabel: "Read the full walkthrough →",
  },
  {
    q: "Is this live pricing?",
    a: "Prices are delayed/end-of-day quotes, refreshed on a schedule through the trading day, not a tick-by-tick real-time feed.",
  },
  {
    q: "Where does the data come from?",
    a: "The exchange's own public data pages, plus PSE's published Daily Quotation Report and Market Watch PDFs for block sales and foreign flow. Everything is pulled by scheduled jobs, never scraped live on your visit.",
  },
  {
    q: "Is PSEye free to use?",
    a: "Yes. PSEye is a free, community-first tracker for the Philippine Stock Exchange. There is no login, subscription, or paywall.",
  },
  {
    q: "How often do prices update?",
    a: "Hourly during PSE trading hours (roughly 9am-4pm PHT, weekdays), with the last run of the day capturing the finalized close.",
  },
  {
    q: "What else can I track on PSEye?",
    a: "Market-cap and dividend-yield rankings, ex-dividend dates, net foreign buying and selling, block sales, disclosures, and a per-day market recap, all linked from the menu above.",
  },
];

const FAQ_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

export default async function MarketMapPage() {
  const [quotes, profileByTicker, snapshot, foreignFlow, recapDates] = await Promise.all([
    getDailyQuotes(),
    getCompanyProfiles(),
    getMarketSnapshot(),
    getLatestForeignFlow(),
    // Newest first. Resolved server-side rather than reusing the client's
    // /api/market-map date list so the mobile summary's "Full daily recap"
    // link is present in the first paint instead of popping in after a fetch.
    getRecentRecapDates(1),
  ]);
  const sparklineByTicker = await getRealSparklines(quotes.map((q) => q.ticker));
  const status = getMarketStatus();
  // Falls back to today only when no session has been recorded at all (no DB /
  // empty table) — the same "never break the page" contract every lib/* reader
  // here follows.
  const latestRecapDate = recapDates[0] ?? manilaToday();

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }} />
      {/* NOTE: the daily X/Twitter screenshot no longer targets this id — it
          now targets #market-map-canvas inside MarketMap.tsx (just the
          treemap, not the filter sidebar/PSEi summary/top movers). This
          wrapper still exists for the skip-link below. */}
      <div id="market-map-capture">
        {/* WCAG 2.4.1: the treemap renders one focusable button per company —
            284 of them, measured — and it is the last thing in <main>, so
            without this a keyboard user who wants the FAQ (or the footer) has
            to tab through every listed stock to get there. Visually hidden
            until focused, like the site-wide skip link in layout.tsx. Sits
            before MarketMap (whose own header now carries the kicker/badge/h1 —
            see MarketMap.tsx) so it also skips the filter sidebar and toolbar. */}
        <a
          href="#market-map-faq"
          className="sr-only focus:not-sr-only focus:mt-4 focus:inline-block focus:rounded-md focus:bg-panel focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-panel-fg focus:ring-1 focus:ring-panel-border"
        >
          Skip the market map
        </a>
        <MarketMap
          stocks={quotes}
          profileByTicker={profileByTicker}
          snapshot={snapshot}
          foreignFlow={foreignFlow}
          sparklineByTicker={sparklineByTicker}
          latestRecapDate={latestRecapDate}
          status={status}
        />
      </div>

      {/* Target of the "Skip the market map" bypass link above; tabIndex -1 so
          the jump actually moves focus here rather than only scrolling. */}
      <div id="market-map-faq" tabIndex={-1} className="focus:outline-none">
        <MarketMapFaq items={FAQ} />
      </div>
    </div>
  );
}
