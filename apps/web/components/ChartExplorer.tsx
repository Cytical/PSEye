"use client";

import { useState } from "react";
import { TradingViewChart } from "./TradingViewChart";

/**
 * TradingView's free embeddable widgets don't carry PSE-sourced data — every
 * PSE ticker (and the PSEi index) renders "This symbol is only available on
 * TradingView" in the widget, confirmed across chart/overview/quote widget
 * types, even though the same symbols work fine on tradingview.com itself.
 * NASDAQ names do render live in the widget, so that's what this page offers
 * by default. `allow_symbol_change` on the widget still lets a visitor
 * search any other symbol themselves.
 */
const NASDAQ_TICKERS = [
  { symbol: "NASDAQ:AAPL", label: "Apple" },
  { symbol: "NASDAQ:MSFT", label: "Microsoft" },
  { symbol: "NASDAQ:GOOGL", label: "Alphabet (Google)" },
  { symbol: "NASDAQ:AMZN", label: "Amazon" },
  { symbol: "NASDAQ:TSLA", label: "Tesla" },
  { symbol: "NASDAQ:NVDA", label: "Nvidia" },
  { symbol: "NASDAQ:META", label: "Meta Platforms" },
  { symbol: "NASDAQ:NFLX", label: "Netflix" },
  { symbol: "NASDAQ:AMD", label: "AMD" },
  { symbol: "NASDAQ:INTC", label: "Intel" },
];

export function ChartExplorer() {
  const [symbol, setSymbol] = useState<string>(NASDAQ_TICKERS[0].symbol);

  return (
    <div className="flex flex-col gap-4">
      <label className="flex max-w-xs flex-col gap-1 text-sm">
        <span className="text-black/60 dark:text-white/60">Stock</span>
        <select
          className="rounded border border-black/15 bg-transparent px-2 py-1.5 dark:border-white/15"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
        >
          {NASDAQ_TICKERS.map((t) => (
            <option key={t.symbol} value={t.symbol}>
              {t.symbol.replace("NASDAQ:", "")} — {t.label}
            </option>
          ))}
        </select>
      </label>

      <TradingViewChart symbol={symbol} />
    </div>
  );
}
