"use client";

import { useEffect, useMemo, useState } from "react";
import { MockHistoricalQuoteSource, type Quote } from "@pseye/source-quotes";
import { buildCompositeHistory, simulateDca, type DcaFrequency, type DcaResult } from "@/lib/dca";
import { DcaChart } from "./DcaChart";

const COMPOSITE_VALUE = "__PSEI_COMPOSITE__";

function defaultStartDate(): string {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 3);
  return d.toISOString().slice(0, 10);
}

function currency(n: number): string {
  return `₱${n.toLocaleString("en-PH", { maximumFractionDigits: 0 })}`;
}

export function DcaCalculator({ quotes }: { quotes: Quote[] }) {
  const [ticker, setTicker] = useState<string>(quotes[0]?.ticker ?? "");
  const [startDate, setStartDate] = useState(defaultStartDate());
  const [contribution, setContribution] = useState(5000);
  const [frequency, setFrequency] = useState<DcaFrequency>("monthly");
  const [result, setResult] = useState<DcaResult | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedLabel = useMemo(() => {
    if (ticker === COMPOSITE_VALUE) return "PSEi (equal-weighted proxy)";
    return quotes.find((q) => q.ticker === ticker)?.companyName ?? ticker;
  }, [ticker, quotes]);

  // Anchored to `quotes` (whatever the page passed in — DB or mock) so the
  // simulated history's latest close always matches the price shown elsewhere.
  const historySource = useMemo(() => new MockHistoricalQuoteSource(quotes), [quotes]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      const history =
        ticker === COMPOSITE_VALUE
          ? buildCompositeHistory(
              await Promise.all(quotes.map((q) => historySource.getHistory(q.ticker, startDate)))
            )
          : await historySource.getHistory(ticker, startDate);

      if (cancelled) return;
      setResult(simulateDca(history, { contribution, frequency }));
      setLoading(false);
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [ticker, startDate, contribution, frequency, quotes, historySource]);

  return (
    <div className="flex flex-col gap-6">
      <form
        className="grid grid-cols-2 gap-4 sm:grid-cols-4"
        onSubmit={(e) => e.preventDefault()}
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-black/60 dark:text-white/60">Invest in</span>
          <select
            className="rounded border border-black/15 bg-transparent px-2 py-1.5 dark:border-white/15"
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
          >
            <option value={COMPOSITE_VALUE}>PSEi (equal-weighted proxy)</option>
            {quotes.map((q) => (
              <option key={q.ticker} value={q.ticker}>
                {q.ticker} — {q.companyName}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-black/60 dark:text-white/60">Start date</span>
          <input
            type="date"
            className="rounded border border-black/15 bg-transparent px-2 py-1.5 dark:border-white/15"
            value={startDate}
            max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => e.target.value && setStartDate(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-black/60 dark:text-white/60">Contribution (₱)</span>
          <input
            type="number"
            min={100}
            step={100}
            className="rounded border border-black/15 bg-transparent px-2 py-1.5 dark:border-white/15"
            value={contribution}
            onChange={(e) => setContribution(Math.max(0, Number(e.target.value) || 0))}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm">
          <span className="text-black/60 dark:text-white/60">Frequency</span>
          <select
            className="rounded border border-black/15 bg-transparent px-2 py-1.5 dark:border-white/15"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as DcaFrequency)}
          >
            <option value="monthly">Monthly</option>
            <option value="weekly">Weekly</option>
          </select>
        </label>
      </form>

      {loading && <p className="text-sm text-black/50 dark:text-white/50">Simulating…</p>}

      {!loading && result && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Stat label="Total contributed" value={currency(result.totalContributed)} />
            <Stat label={`${selectedLabel} value today`} value={currency(result.currentValue)} />
            <Stat
              label="Return"
              value={`${result.returnPct >= 0 ? "+" : ""}${result.returnPct.toFixed(1)}%`}
              tone={result.returnPct >= 0 ? "up" : "down"}
            />
            <Stat label="Shares/units accumulated" value={result.totalShares.toFixed(2)} />
          </div>
          <DcaChart timeline={result.timeline} />
        </div>
      )}

      {!loading && !result && (
        <p className="text-sm text-black/50 dark:text-white/50">
          Pick a start date at least one period in the past to see results.
        </p>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "up" | "down" }) {
  const toneClass =
    tone === "up"
      ? "text-[#006300] dark:text-[#0ca30c]"
      : tone === "down"
        ? "text-[#d03b3b]"
        : "";
  return (
    <div className="rounded-md border border-black/10 p-3 dark:border-white/10">
      <div className="text-[11px] text-black/50 dark:text-white/50">{label}</div>
      <div className={`mt-0.5 text-lg font-semibold tabular-nums ${toneClass}`}>{value}</div>
    </div>
  );
}
