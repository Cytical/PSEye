import type { Metadata } from "next";
import { ChartExplorer } from "@/components/ChartExplorer";

export const metadata: Metadata = {
  title: "Stock Charts: NASDAQ Candlesticks",
  description: "Interactive candlestick charts for major NASDAQ stocks, powered by TradingView.",
  alternates: { canonical: "/charts" },
};

export default function ChartsPage() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8">
      <p className="kicker text-accent">Tools</p>
      <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-panel-fg sm:text-3xl">Charts</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-panel-fg/65">
        Interactive candlestick charts, powered by TradingView&apos;s free embed. TradingView
        doesn&apos;t license PSE-listed data for third-party embeds, so this covers NASDAQ names
        for now. Use the widget&apos;s search to jump to any other symbol TradingView supports.
      </p>

      <div className="mt-6">
        <ChartExplorer />
      </div>
    </div>
  );
}
