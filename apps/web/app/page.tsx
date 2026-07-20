import type { Metadata } from "next";
import { getDailyQuotes } from "@/lib/quotes";
import { getCompanyProfiles } from "@/lib/companyProfiles";
import { getMarketSnapshot } from "@/lib/marketSnapshot";
import { getLatestForeignFlow } from "@/lib/latestForeignFlow";
import { getRealSparklines } from "@/lib/sparklines";
import { MarketMap } from "@/components/MarketMap";

export const revalidate = 3600; // hourly; matches the intraday ETL cadence

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
    a: "PSE stock prices and market-cap rankings, dividend yields, ex-dividend dates, net foreign buying and selling, block sales, disclosures, IPO offerings, and a per-day market recap.",
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
    <div className="mx-auto max-w-[1600px] px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }} />
      <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">The Philippine Stock Market, Visualized</h1>
      <p className="mt-2 max-w-3xl text-sm text-foreground/70">
        A live map of the Philippine Stock Exchange (PSE): every listed company sized by market
        capitalization and colored by today&apos;s price change. Explore PSEi stock prices, dividend
        yields, and sector performance at a glance.
      </p>
      <div className="mt-6">
        <MarketMap
          stocks={quotes}
          profileByTicker={profileByTicker}
          snapshot={snapshot}
          foreignFlow={foreignFlow}
          sparklineByTicker={sparklineByTicker}
        />
      </div>

      <section className="mt-12 border-t border-black/10 pt-8 dark:border-white/10">
        <h2 className="text-lg font-semibold">Frequently asked questions</h2>
        <dl className="mt-4 max-w-3xl space-y-5">
          {FAQ.map((item) => (
            <div key={item.q}>
              <dt className="font-medium">{item.q}</dt>
              <dd className="mt-1 text-sm text-foreground/70">{item.a}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}
