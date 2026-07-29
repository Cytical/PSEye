import type { HistoricalClose } from "@pseye/source-quotes";
import {
  annualizedVolatility,
  maxDrawdown,
  rsi,
  rsiLabel,
  sma,
  trailingReturn,
} from "@/lib/analytics";
import { Kpi } from "./Kpi";
import { RadialGauge } from "./RadialGauge";
import { InfoTip } from "./InfoTip";

/**
 * Static server-rendered risk/technical metrics (no "use client", zero client
 * JS — same rationale as StockPriceChart). Every figure is derived purely from
 * the year of closes the stock page already fetched for its 52-week stats, so
 * this adds real analytical depth without a single extra query.
 *
 * Renders the panel *body* only — the card shell, heading, and window label
 * belong to the `Panel` the dashboard wraps this in, so every section of that
 * page shares one chrome instead of each component drawing its own.
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

  const returns: { label: string; value: string; tone?: "up" | "down" }[] = [];
  if (ret1m != null) returns.push({ label: "1 month", value: pct(ret1m), tone: signTone(ret1m) });
  if (ret3m != null) returns.push({ label: "3 months", value: pct(ret3m), tone: signTone(ret3m) });
  if (ret1y != null) returns.push({ label: "1 year", value: pct(ret1y), tone: signTone(ret1y) });

  const risk: { label: string; value: string; tone?: "up" | "down"; hint?: string; info?: string }[] = [];
  if (vol != null)
    risk.push({
      label: "Volatility",
      value: `${vol.toFixed(1)}%`,
      hint: `annualized · ${volHint(vol)}`,
      info: "Annualized standard deviation of daily log returns — how much the price swings day to day, scaled to a yearly figure. Higher means bigger, more frequent moves in either direction.",
    });
  if (dd != null)
    risk.push({
      label: "Max drawdown",
      value: pct(dd),
      tone: dd <= -20 ? "down" : undefined,
      hint: "past year",
      info: "The worst peak-to-trough decline over the past year — how far the price fell from its highest point before recovering.",
    });
  if (ma50 != null)
    risk.push({
      label: "50-day avg",
      value: `₱${ma50.toFixed(2)}`,
      tone: price >= ma50 ? "up" : "down",
      hint: price >= ma50 ? "price above" : "price below",
      info: "Simple moving average of the last 50 closing prices — a short-term trend line.",
    });
  if (ma200 != null)
    risk.push({
      label: "200-day avg",
      value: `₱${ma200.toFixed(2)}`,
      tone: price >= ma200 ? "up" : "down",
      hint: price >= ma200 ? "price above" : "price below",
      info: "Simple moving average of the last 200 closing prices — a longer-term trend line.",
    });

  if (returns.length === 0 && risk.length === 0 && rsiValue == null) return null;

  const rsiTone: "up" | "down" | undefined =
    rsiValue == null ? undefined : rsiValue >= 70 ? "down" : rsiValue <= 30 ? "up" : undefined;

  return (
    <div className="flex h-full flex-col gap-2.5">
      {rsiValue != null && (
        <div className="flex items-center gap-2.5 rounded-lg bg-panel-raised px-2.5 py-1.5">
          <RadialGauge value={rsiValue} tone={rsiTone} />
          <div className="min-w-0">
            <div className="flex items-center gap-0.5 text-[10.5px] leading-tight text-panel-fg/60">
              RSI (14)
              <InfoTip text='Relative Strength Index, Wilder&apos;s 14-day smoothing. Runs 0–100: readings above 70 are typically read as "overbought," below 30 as "oversold." A momentum reading, not a buy/sell signal.' />
            </div>
            <div className="text-[13.5px] font-semibold text-panel-fg">{rsiLabel(rsiValue)}</div>
          </div>
        </div>
      )}

      {returns.length > 0 && (
        <div>
          <SubHead>Trailing return</SubHead>
          <div className="mt-1.5 grid grid-cols-3 gap-x-3 gap-y-2.5">
            {returns.map((m) => (
              <Kpi key={m.label} label={m.label} value={m.value} tone={m.tone} />
            ))}
          </div>
        </div>
      )}

      {risk.length > 0 && (
        <div>
          <SubHead>Risk &amp; trend</SubHead>
          <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-2.5">
            {risk.map((m) => (
              <Kpi key={m.label} label={m.label} value={m.value} tone={m.tone} hint={m.hint} info={m.info} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/** Shared sub-section label — the one hierarchy level below a Panel heading. */
export function SubHead({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="border-b border-panel-border pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-panel-fg/50">
      {children}
    </h3>
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
