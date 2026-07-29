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
import { MarketStatusBadge } from "@/components/MarketStatusBadge";
import { getMarketStatus } from "@/lib/marketStatus";

export const revalidate = 3600; // 1h; matches quotes/market-snapshot's hourly ETL cadence (market-data-hourly.yml) — a tighter window would only add DB reads without fresher data

export const metadata: Metadata = {
  title: "PSE Market Map — Live PSEi Heatmap",
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
    a: "Each box is a listed company. Bigger box means bigger market capitalization; green means the price is up today, red means it's down — the deeper the shade, the bigger the move. Boxes are grouped into panels by PSE sector, so you can see which parts of the market are leading or lagging at a glance.",
  },
  {
    q: "Is this live pricing?",
    a: "Prices are delayed/end-of-day quotes, refreshed on a schedule through the trading day — not a tick-by-tick real-time feed.",
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
    a: "Market-cap and dividend-yield rankings, ex-dividend dates, net foreign buying and selling, block sales, disclosures, and a per-day market recap — all linked from the menu above.",
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
      {/* Screenshotted by etl/jobs/post-daily-tweet.ts (Playwright targets this
          id) for the daily X/Twitter post — kept to just the headline + map,
          not the FAQ below, so the captured image stays a compact, shareable
          card instead of an awkwardly tall crop. */}
      <div id="market-map-capture">
        <div className="flex flex-wrap items-center gap-2.5">
          <p className="kicker text-accent">Market Map</p>
          {/* Seeded with the server's reading so SSR and the first client
              render agree, then kept honest in the browser — this route is
              cached for an hour, so a render-time value would go stale. */}
          <MarketStatusBadge initial={status} />
        </div>
        {/* nowrap only from sm up. Below that the vw term bottoms out at the
            clamp minimum, so the line stops scaling with the viewport and
            simply overflowed it: measured on a 390px phone, "Visualized."
            ended 42px past the right edge and gave the whole homepage a
            horizontal scrollbar. Wrapping to two lines breaks naturally after
            the comma, which also lets the minimum size go up from 1.35rem to
            1.75rem — the headline is bigger on phones now, not smaller. */}
        <h1 className="mt-2 font-serif text-[clamp(1.75rem,4.6vw,3.25rem)] font-semibold leading-[1.05] tracking-tight sm:whitespace-nowrap">
          The Philippine Stock Market, <span className="italic text-accent">Visualized.</span>
        </h1>
        {/* WCAG 2.4.1 again, for the widget rather than the page: the treemap
            renders one focusable button per company — 284 of them, measured —
            and it is the last thing in <main>, so without this a keyboard user
            who wants the FAQ (or the footer) has to tab through every listed
            stock to get there. Visually hidden until focused, like the
            site-wide skip link in layout.tsx. Sits before MarketMap so it also
            skips the filter sidebar and toolbar. */}
        <a
          href="#market-map-faq"
          className="sr-only focus:not-sr-only focus:mt-4 focus:inline-block focus:rounded-md focus:bg-panel focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-panel-fg focus:ring-1 focus:ring-panel-border"
        >
          Skip the market map
        </a>
        {/* Was mt-7. With the map's own toolbar row gone (see MarketMap.tsx),
            that gap was the last of the dead band between the headline and the
            first tile. */}
        <div className="mt-4">
          <MarketMap
            stocks={quotes}
            profileByTicker={profileByTicker}
            snapshot={snapshot}
            foreignFlow={foreignFlow}
            sparklineByTicker={sparklineByTicker}
            latestRecapDate={latestRecapDate}
          />
        </div>
      </div>

      {/* Target of the "Skip the market map" bypass link above; tabIndex -1 so
          the jump actually moves focus here rather than only scrolling. */}
      <div id="market-map-faq" tabIndex={-1} className="focus:outline-none">
        <MarketMapFaq items={FAQ} />
      </div>
    </div>
  );
}
