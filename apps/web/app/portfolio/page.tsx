import type { Metadata } from "next";
import { getDailyQuotes } from "@/lib/quotes";
import { PortfolioTracker } from "@/components/PortfolioTracker";

export const revalidate = 21600; // 6h safety-net ceiling; real refresh is on-demand via revalidateTag/revalidatePath from the ETL jobs (see app/api/revalidate/route.ts) — the wall-clock value only kicks in if that call ever fails.

export const metadata: Metadata = {
  title: "PSE Portfolio Tracker: Track Your Holdings' Gain/Loss",
  description:
    "Track shares and average cost for any PSE-listed stock and see live gain/loss against real quotes. Free, no login: your holdings never leave your browser.",
  alternates: { canonical: "/portfolio" },
};

export default async function PortfolioPage() {
  const quotes = await getDailyQuotes();

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8">
      <p className="kicker text-accent">Tools</p>
      <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-panel-fg sm:text-3xl">Portfolio Tracker</h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-panel-fg/65">
        Add the PSE stocks you hold (shares and average cost per share) to see live cost basis,
        market value, and gain/loss against real end-of-day / delayed quotes. Nothing you enter
        leaves your browser: holdings are stored only in localStorage, the same way the watchlist
        star works. No account, nothing to lose if you clear cookies.
      </p>

      <div className="mt-6">
        <PortfolioTracker quotes={quotes} />
      </div>

      <p className="mt-8 text-xs text-panel-fg/72">
        Not financial advice. Prices are end-of-day / delayed quotes, refreshed
        hourly during trading hours, not real-time.
      </p>
    </div>
  );
}
