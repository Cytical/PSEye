import type { Metadata } from "next";
import { getDailyQuotes } from "@/lib/quotes";
import { getCompanyProfiles } from "@/lib/companyProfiles";
import { getMarketSnapshot } from "@/lib/marketSnapshot";
import { getLatestForeignFlow } from "@/lib/latestForeignFlow";
import { getRealSparklines } from "@/lib/sparklines";
import { MarketMap } from "@/components/MarketMap";

export const revalidate = 3600; // 1h; matches quotes/market-snapshot's hourly ETL cadence (quotes-hourly.yml/market-snapshot-hourly.yml) — a tighter window would only add DB reads without fresher data

export const metadata: Metadata = {
  title: "PSE Market Map — Live PSEi Heatmap",
  description:
    "Live heatmap of the Philippine Stock Exchange (PSE): every PSEi stock sized by market cap and colored by today's % change, grouped by sector. Free, no login.",
  alternates: { canonical: "/" },
};

// Genuine, low-maintenance Q&A — gives the otherwise canvas-only homepage
// crawlable keyword text and can win a "People also ask" result via FAQPage.
const FAQ = [
  {
    q: "What is the PSE market map?",
    a: "It is a live heatmap of the Philippine Stock Exchange. Each box is a listed company, sized by market capitalization and colored green or red by its price change today, grouped by PSE sector — so you can see the whole market at a glance.",
  },
  {
    q: "Is PSEye free to use?",
    a: "Yes. PSEye is a free, community-first tracker for the Philippine Stock Exchange. There is no login, subscription, or paywall.",
  },
  {
    q: "How often do the stock prices update?",
    a: "Prices are end-of-day / delayed quotes sourced from PSE Edge and refreshed on a schedule through the trading day, not a live real-time feed.",
  },
  {
    q: "What can I track on PSEye?",
    a: "PSE stock prices and market-cap rankings, dividend yields, ex-dividend dates, net foreign buying and selling, block sales, disclosures, and a per-day market recap.",
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

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8 sm:py-10">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }} />
      <div className="max-w-3xl">
        <p className="kicker text-accent">Market Map</p>
        <h1 className="mt-1.5 font-serif text-[2.15rem] font-semibold leading-[1.08] tracking-tight sm:text-[2.75rem]">
          The Philippine Stock Market, Visualized
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-foreground/65 sm:text-base">
          A live map of the Philippine Stock Exchange: every listed company sized by market
          capitalization and colored by today&apos;s price change. Explore PSE stock prices, dividend
          yields, and sector performance at a glance.
        </p>
      </div>
      <div className="mt-7">
        <MarketMap
          stocks={quotes}
          profileByTicker={profileByTicker}
          snapshot={snapshot}
          foreignFlow={foreignFlow}
          sparklineByTicker={sparklineByTicker}
        />
      </div>

      <section className="mt-14 max-w-3xl border-t border-foreground/10 pt-8">
        <p className="kicker text-foreground/45">Good to know</p>
        <h2 className="mt-1.5 font-serif text-xl font-semibold tracking-tight">Frequently asked questions</h2>
        <dl className="mt-5 divide-y divide-foreground/10">
          {FAQ.map((item) => (
            <div key={item.q} className="py-4 first:pt-0">
              <dt className="font-medium">{item.q}</dt>
              <dd className="mt-1.5 text-sm leading-relaxed text-foreground/65">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
