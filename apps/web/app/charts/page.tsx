import type { Metadata } from "next";
import { ChartExplorer } from "@/components/ChartExplorer";

export const metadata: Metadata = {
  title: "Charts",
  description: "Interactive candlestick charts for major NASDAQ stocks, powered by TradingView.",
};

export default function ChartsPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="text-xl font-semibold">Charts</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Interactive candlestick charts, powered by TradingView&apos;s free embed. TradingView
        doesn&apos;t license PSE-listed stock data for embedding on third-party sites, so this
        covers NASDAQ names for now — use the widget&apos;s own search to jump to any other
        symbol TradingView does support.
      </p>

      <div className="mt-6">
        <ChartExplorer />
      </div>
    </div>
  );
}
