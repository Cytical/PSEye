import type { HistoricalClose } from "@pseye/source-quotes";
import {
  annualizedVolatility,
  maxDrawdown,
  rsi,
  rsiLabel,
  sma,
  trailingReturn,
} from "@/lib/analytics";
import { InfoTip } from "./InfoTip";

/**
 * Static server-rendered risk/technical panel (no "use client", zero client
 * JS — same rationale as StockPriceChart). Every figure is derived purely from
 * the year of closes the stock page already fetched for its 52-week stats, so
 * this adds real analytical depth without a single extra query.
 *
 * Only rendered when the page has real DB-backed closes (never the mock walk),
 * and only when there's enough history for the metrics to mean something — the
 * page gates on `yearCloses.length` before mounting this.
 */
export function StockAnalytics({ closes }: { closes: HistoricalClose[] }) {
  const series = closes.map((c) => c.close);
  const price = series[series.length - 1];

  const vol = annualizedVolatility(series);
  const rsiValue = rsi(series);
  const ma50 = sma(series, 50);
  const ma200 = sma(series, 200);
  const dd = maxDrawdown(series);
  const ret1m = trailingReturn(series, 21); // ~21 trading days ≈ 1 month
  const ret3m = trailingReturn(series, 63); // ~63 ≈ 3 months
  const ret1y = trailingReturn(series, 251); // ~1 trading year

  const metrics: { label: string; value: string; tone?: "up" | "down"; hint?: string; info?: string }[] = [];

  if (ret1m != null) metrics.push({ label: "1-month return", value: pct(ret1m), tone: signTone(ret1m) });
  if (ret3m != null) metrics.push({ label: "3-month return", value: pct(ret3m), tone: signTone(ret3m) });
  if (ret1y != null) metrics.push({ label: "1-year return", value: pct(ret1y), tone: signTone(ret1y) });

  if (vol != null)
    metrics.push({
      label: "Volatility (annualized)",
      value: `${vol.toFixed(1)}%`,
      hint: volHint(vol),
      info: "Annualized standard deviation of daily log returns — how much the price swings day to day, scaled to a yearly figure. Higher means bigger, more frequent moves in either direction.",
    });

  if (ma50 != null)
    metrics.push({
      label: "50-day avg",
      value: `₱${ma50.toFixed(2)}`,
      tone: price >= ma50 ? "up" : "down",
      hint: price >= ma50 ? "price above" : "price below",
      info: "Simple moving average of the last 50 closing prices — a short-term trend line.",
    });
  if (ma200 != null)
    metrics.push({
      label: "200-day avg",
      value: `₱${ma200.toFixed(2)}`,
      tone: price >= ma200 ? "up" : "down",
      hint: price >= ma200 ? "price above" : "price below",
      info: "Simple moving average of the last 200 closing prices — a longer-term trend line.",
    });

  if (rsiValue != null) {
    const label = rsiLabel(rsiValue);
    metrics.push({
      label: "RSI (14)",
      value: rsiValue.toFixed(0),
      tone: label === "overbought" ? "down" : label === "oversold" ? "up" : undefined,
      hint: label,
      info: "Relative Strength Index, Wilder's 14-day smoothing. Runs 0–100: readings above 70 are typically read as \"overbought,\" below 30 as \"oversold.\" A momentum reading, not a buy/sell signal.",
    });
  }

  if (dd != null)
    metrics.push({
      label: "Max drawdown (1y)",
      value: pct(dd),
      tone: dd <= -20 ? "down" : undefined,
      info: "The worst peak-to-trough decline over the past year — how far the price fell from its highest point before recovering.",
    });

  if (metrics.length === 0) return null;

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h2 className="kicker text-panel-fg/68">Analytics</h2>
        <span className="text-[11px] text-panel-fg/65">derived from ~1yr of closing prices</span>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {metrics.map((m) => (
          <div
            key={m.label}
            className="rounded-xl bg-panel p-3 shadow-sm shadow-black/5 ring-1 ring-panel-border"
          >
            <div className="text-[11px] text-panel-fg/68">
              {m.label}
              {m.info && <InfoTip text={m.info} />}
            </div>
            <div
              className={`mt-0.5 text-lg font-semibold tabular-nums ${
                m.tone === "up" ? "text-up" : m.tone === "down" ? "text-down" : "text-panel-fg"
              }`}
            >
              {m.value}
            </div>
            {m.hint && <div className="mt-0.5 text-[10px] text-panel-fg/65">{m.hint}</div>}
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-panel-fg/68">
        Descriptive statistics, not a forecast or a signal.
      </p>
    </div>
  );
}

function pct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}

function signTone(n: number): "up" | "down" | undefined {
  if (n > 0) return "up";
  if (n < 0) return "down";
  return undefined;
}

function volHint(vol: number): string {
  if (vol < 20) return "low";
  if (vol < 40) return "moderate";
  if (vol < 70) return "high";
  return "very high";
}
