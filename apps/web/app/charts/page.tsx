import type { Metadata } from "next";
import { ChartExplorer } from "@/components/ChartExplorer";

export const metadata: Metadata = {
  title: "Stock Charts — NASDAQ Candlesticks",
  description: "Interactive candlestick charts for major NASDAQ stocks, powered by TradingView.",
  alternates: { canonical: "/charts" },
};

export default function ChartsPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-panel-fg">Charts</h1>
      <p className="mt-1.5 text-sm text-panel-fg/60">
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
