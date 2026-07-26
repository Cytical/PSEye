import type { Metadata } from "next";
import { getDailyQuotes } from "@/lib/quotes";
import { getCompanyProfiles } from "@/lib/companyProfiles";
import { getMarketSnapshot } from "@/lib/marketSnapshot";
import { getLatestForeignFlow } from "@/lib/latestForeignFlow";
import { getRealSparklines } from "@/lib/sparklines";
import { MarketMap } from "@/components/MarketMap";
import { MarketMapFaq } from "@/components/MarketMapFaq";

/**
 * Approximate, computed at render time (this page revalidates hourly, so it
 * can't tick live client-side anyway). PSE's core continuous trading session
 * is Mon-Fri 9:30am-3:30pm PHT; pre-open/trading-at-last minutes at the edges
 * are treated as closed since the badge is a rough "is it worth checking
 * back right now" signal, not a precise exchange-status feed.
 */
function getMarketStatus(): { open: boolean; label: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(new Date());
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const minutesOfDay = hour * 60 + minute;
  const isWeekday = weekday !== "Sat" && weekday !== "Sun";
  const isTradingHours = minutesOfDay >= 9 * 60 + 30 && minutesOfDay < 15 * 60 + 30;
  const open = isWeekday && isTradingHours;
  return { open, label: open ? "Market open" : "Market closed" };
}

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
    a: "Prices are delayed/end-of-day quotes sourced from PSE Edge, refreshed on a schedule through the trading day — not a tick-by-tick real-time feed.",
  },
  {
    q: "Where does the data come from?",
    a: "PSE Edge, the exchange's own public data platform, plus PSE's published Daily Quotation Report and Market Watch PDFs for block sales and foreign flow. Everything is pulled by scheduled jobs, never scraped live on your visit.",
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
  const [quotes, profileByTicker, snapshot, foreignFlow] = await Promise.all([
    getDailyQuotes(),
    getCompanyProfiles(),
    getMarketSnapshot(),
    getLatestForeignFlow(),
  ]);
  const sparklineByTicker = await getRealSparklines(quotes.map((q) => q.ticker));
  const status = getMarketStatus();

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }} />
      <div className="flex flex-wrap items-center gap-2.5">
        <p className="kicker text-accent">Market Map</p>
        <span className="flex items-center gap-1.5 rounded-full border border-panel-border bg-panel px-2 py-0.5 text-[10px] font-medium text-panel-fg/70">
          <span className={`h-1.5 w-1.5 rounded-full ${status.open ? "animate-pulse bg-up" : "bg-panel-fg/30"}`} />
          {status.label}
        </span>
      </div>
      <h1 className="mt-2 whitespace-nowrap font-serif text-[clamp(1.35rem,4.6vw,3.25rem)] font-semibold leading-[1.05] tracking-tight">
        The Philippine Stock Market, <span className="italic text-accent">Visualized.</span>
      </h1>
      <div className="mt-7">
        <MarketMap
          stocks={quotes}
          profileByTicker={profileByTicker}
          snapshot={snapshot}
          foreignFlow={foreignFlow}
          sparklineByTicker={sparklineByTicker}
        />
      </div>

      <MarketMapFaq items={FAQ} />
    </div>
  );
}
