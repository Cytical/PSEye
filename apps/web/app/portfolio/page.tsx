import type { Metadata } from "next";
import { getDailyQuotes } from "@/lib/quotes";
import { PortfolioTracker } from "@/components/PortfolioTracker";

export const revalidate = 3600; // matches quotes' hourly ETL cadence — same window as the market map

export const metadata: Metadata = {
  title: "PSE Portfolio Tracker — Track Your Holdings' Gain/Loss",
  description:
    "Track shares and average cost for any PSE-listed stock and see live gain/loss against real quotes. Free, no login — your holdings never leave your browser.",
  alternates: { canonical: "/portfolio" },
};

export default async function PortfolioPage() {
  const quotes = await getDailyQuotes();

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-panel-fg">Portfolio Tracker</h1>
      <p className="mt-1.5 max-w-3xl text-sm text-panel-fg/60">
        Add the PSE stocks you hold — shares and average cost per share — and see live cost basis,
        market value, and gain/loss against real end-of-day / delayed quotes. Nothing you enter is
        sent anywhere: holdings are stored only in this browser (localStorage), the same way the
        watchlist star works, so there&apos;s no account and nothing to lose if you clear cookies on
        a device you don&apos;t plan to return to.
      </p>

      <div className="mt-6">
        <PortfolioTracker quotes={quotes} />
      </div>

      <p className="mt-8 text-xs text-panel-fg/60">
        Not financial advice. Prices are end-of-day / delayed quotes from PSE Edge, refreshed
        hourly during trading hours — not real-time.
      </p>
    </div>
  );
}
