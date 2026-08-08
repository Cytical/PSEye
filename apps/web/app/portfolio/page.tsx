import type { Metadata } from "next";
import { getDailyQuotes } from "@/lib/quotes";
import { getDividendScreener } from "@/lib/dividends";
import { PortfolioTracker } from "@/components/PortfolioTracker";

export const revalidate = 21600; // 6h safety-net ceiling; real refresh is on-demand via revalidateTag/revalidatePath from the ETL jobs (see app/api/revalidate/route.ts) — the wall-clock value only kicks in if that call ever fails.

export const metadata: Metadata = {
  title: "PSE Portfolio Tracker: Track Your Holdings' Gain/Loss",
  description:
    "Track a real buy/sell log for any PSE-listed stock and see live gain/loss, realized P&L, dividend income, and risk vs. the PSEi. Free, no login: nothing leaves your browser.",
  alternates: { canonical: "/portfolio" },
};

export default async function PortfolioPage() {
  const [quotes, dividendScreener] = await Promise.all([getDailyQuotes(), getDividendScreener()]);

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8">
      <p className="kicker text-accent">Tools</p>
      <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-panel-fg sm:text-3xl">Portfolio Tracker</h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-panel-fg/65">
        Log every buy and sell (shares and price) for the PSE stocks you trade to see live cost
        basis, market value, gain/loss, realized P&amp;L, dividend income, and risk against real
        end-of-day / delayed quotes. Nothing you enter leaves your browser: your transaction log is
        stored only in localStorage, the same way the watchlist star works. No account, nothing to
        lose if you clear cookies.
      </p>

      <div className="mt-6">
        <PortfolioTracker quotes={quotes} dividendRows={dividendScreener.rows} />
      </div>

      <p className="mt-8 text-xs text-panel-fg/72">
        Not financial advice. Prices are end-of-day / delayed quotes, refreshed
        hourly during trading hours, not real-time.
      </p>
    </div>
  );
}
