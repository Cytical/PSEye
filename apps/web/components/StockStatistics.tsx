import type { HistoricalClose } from "@pseye/source-quotes";
import {
  annualizedReturn,
  dailyReturns,
  downsideDeviation,
  excessKurtosis,
  historicalVaR,
  mean,
  monthlyReturnStats,
  PH_ANNUAL_RISK_FREE,
  positiveDayRatio,
  sharpeRatio,
  skewness,
  sortinoRatio,
  toDailyRate,
  TRADING_DAYS_PER_YEAR,
} from "@/lib/analytics";
import { ReturnHistogram } from "./ReturnHistogram";
import { InfoTip } from "./InfoTip";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface DividendSummary {
  /** Trailing-12-month dividend yield (%), or null when unknown/none. */
  yieldPct: number | null;
  /** Trailing-12-month cash dividend total, ₱/share. */
  ttm: number;
  /** How many trailing-12-month payouts were parsed. */
  payoutCount: number;
}

/**
 * Static server-rendered "advanced statistics" profile (zero client JS) — the
 * data-science layer PH retail tools don't surface: risk-adjusted return,
 * the full daily-return distribution (shape + tail risk), income yield, and
 * seasonality. Everything is close-based, computed from the ~1yr of closes the
 * stock page already holds (plus dividend data it already fetched), so no extra
 * queries. Only mounts with real data and enough history (page gates on it).
 */
export function StockStatistics({
  closes,
  dividend,
}: {
  closes: HistoricalClose[];
  dividend: DividendSummary | null;
}) {
  const series = closes.map((c) => c.close);
  const returns = dailyReturns(series);
  if (returns.length < 30) return null;

  const rfDaily = toDailyRate(PH_ANNUAL_RISK_FREE);
  const annualize = Math.sqrt(TRADING_DAYS_PER_YEAR);

  const annReturn = annualizedReturn(series);
  const sharpe = sharpeRatio(returns, rfDaily);
  const sortino = sortinoRatio(returns, rfDaily);
  const downDev = downsideDeviation(returns, rfDaily);
  const downDevAnnPct = downDev == null ? null : downDev * annualize * 100;

  const avgDaily = mean(returns) * 100;
  const posDays = positiveDayRatio(returns);
  const skew = skewness(returns);
  const kurt = excessKurtosis(returns);
  const best = Math.max(...returns) * 100;
  const worst = Math.min(...returns) * 100;
  const var95 = historicalVaR(returns, 0.95);
  const var99 = historicalVaR(returns, 0.99);

  const monthly = monthlyReturnStats(closes);
  const monthlyWithData = monthly.filter((m) => m.avgReturn != null);
  const maxYears = Math.max(0, ...monthly.map((m) => m.years));

  return (
    <div>
      <div className="flex items-baseline justify-between">
        <h2 className="kicker text-panel-fg/68">Statistical profile</h2>
        <span className="text-[11px] text-panel-fg/65">{returns.length + 1} daily closes</span>
      </div>

      {/* Risk-adjusted return */}
      <h3 className="mt-3 text-xs font-semibold text-panel-fg/70">Risk-adjusted return</h3>
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile
          label="Annualized return"
          value={annReturn == null ? "—" : pct(annReturn)}
          tone={toneOf(annReturn)}
          info="Compound annual growth rate implied by the closing-price series over this window."
        />
        <Tile
          label="Sharpe ratio"
          value={sharpe == null ? "—" : sharpe.toFixed(2)}
          tone={toneOf(sharpe)}
          hint="return per unit of risk"
          info="Excess return over the risk-free rate, divided by total volatility. Higher is better; above 1 is generally considered good, above 2 very good."
        />
        <Tile
          label="Sortino ratio"
          value={sortino == null ? "—" : sortino.toFixed(2)}
          tone={toneOf(sortino)}
          hint="return per unit of downside risk"
          info="Like the Sharpe ratio, but only penalizes downside volatility (losses), not upside swings — a stock that only ever surprises to the upside scores better here than on Sharpe."
        />
        <Tile
          label="Downside deviation"
          value={downDevAnnPct == null ? "—" : `${downDevAnnPct.toFixed(1)}%`}
          hint="annualized, losses only"
          info="Standard deviation of returns below the risk-free rate — volatility from losing days only, ignoring how much the stock swings upward."
        />
      </div>

      {/* Return distribution */}
      <h3 className="mt-5 text-xs font-semibold text-panel-fg/70">Daily return distribution</h3>
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="Avg daily return" value={pct2(avgDaily)} tone={toneOf(avgDaily)} />
        <Tile label="Positive days" value={posDays == null ? "—" : `${posDays.toFixed(0)}%`} />
        <Tile
          label="Skewness"
          value={skew == null ? "—" : skew.toFixed(2)}
          hint={skew == null ? undefined : skew > 0.1 ? "right tail" : skew < -0.1 ? "left tail" : "symmetric"}
          info="Asymmetry of the daily-return distribution. Positive means occasional large up days pull the tail right; negative means occasional large down days pull it left."
        />
        <Tile
          label="Excess kurtosis"
          value={kurt == null ? "—" : kurt.toFixed(2)}
          hint={kurt == null ? undefined : kurt > 1 ? "fat tails" : "near-normal"}
          info={
            'How much more often extreme daily moves happen versus a normal distribution. Higher means more "fat tail" surprise days than a bell curve would predict.'
          }
        />
        <Tile label="Best day" value={pct(best)} tone="up" />
        <Tile label="Worst day" value={pct(worst)} tone="down" />
        <Tile
          label="Value-at-Risk (95%)"
          value={var95 == null ? "—" : `−${var95.toFixed(1)}%`}
          tone="down"
          hint="worst 5% of days"
          info="Historical VaR: read directly off the actual return distribution, not a normal-model estimate. On the worst 5% of days in this window, the loss was at least this large."
        />
        <Tile
          label="Value-at-Risk (99%)"
          value={var99 == null ? "—" : `−${var99.toFixed(1)}%`}
          tone="down"
          hint="worst 1% of days"
          info="Same as VaR (95%), but for the worst 1% of days — a rarer, larger loss threshold."
        />
      </div>

      <div className="mt-3 rounded-xl bg-panel p-3 shadow-sm shadow-black/5 ring-1 ring-panel-border">
        <ReturnHistogram returns={returns} />
      </div>

      {/* Income */}
      {dividend && (dividend.yieldPct != null || dividend.payoutCount > 0) && (
        <>
          <h3 className="mt-5 text-xs font-semibold text-panel-fg/70">Income</h3>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Tile
              label="Dividend yield (TTM)"
              value={dividend.yieldPct == null ? "—" : `${dividend.yieldPct.toFixed(2)}%`}
              tone={dividend.yieldPct != null && dividend.yieldPct > 0 ? "up" : undefined}
            />
            <Tile label="Dividends (TTM)" value={`₱${dividend.ttm.toFixed(4).replace(/\.?0+$/, "")}`} />
            <Tile label="Payouts (TTM)" value={String(dividend.payoutCount)} />
          </div>
        </>
      )}

      {/* Seasonality */}
      {monthlyWithData.length >= 6 && (
        <>
          <h3 className="mt-5 text-xs font-semibold text-panel-fg/70">
            Seasonality{" "}
            <span className="font-normal text-panel-fg/65">
              — average return by calendar month (up to {maxYears} {maxYears === 1 ? "year" : "years"} of data)
            </span>
          </h3>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full min-w-[560px] border-separate border-spacing-1 text-center text-xs">
              <thead>
                <tr>
                  {monthly.map((m) => (
                    <th key={m.month} className="p-1 font-medium text-panel-fg/68">
                      {MONTH_LABELS[m.month - 1]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  {monthly.map((m) => (
                    <td
                      key={m.month}
                      className="rounded-md p-1.5 tabular-nums text-panel-fg"
                      style={{ backgroundColor: seasonColor(m.avgReturn) }}
                      title={
                        m.avgReturn == null
                          ? `${MONTH_LABELS[m.month - 1]}: no data`
                          : `${MONTH_LABELS[m.month - 1]}: ${pct(m.avgReturn)} avg over ${m.years} ${m.years === 1 ? "year" : "years"}`
                      }
                    >
                      {m.avgReturn == null ? "—" : `${m.avgReturn >= 0 ? "+" : ""}${m.avgReturn.toFixed(1)}`}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-1 text-[11px] text-panel-fg/65">
            Only a few years of history back each month, so this is descriptive color, not a
            predictable &ldquo;month effect.&rdquo;
          </p>
        </>
      )}

      <p className="mt-3 text-[11px] text-panel-fg/68">
        Sharpe/Sortino use a ~{(PH_ANNUAL_RISK_FREE * 100).toFixed(2)}% annual risk-free assumption.
        Descriptive statistics on past closes — not a forecast, stock pick, or buy/sell signal.
      </p>
    </div>
  );
}

function pct(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(1)}%`;
}
function pct2(n: number): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(2)}%`;
}
function toneOf(n: number | null): "up" | "down" | undefined {
  if (n == null) return undefined;
  if (n > 0) return "up";
  if (n < 0) return "down";
  return undefined;
}

/** Month cell shade: green tint for positive average, red tint for negative, scaled by magnitude. Theme-aware. */
function seasonColor(avg: number | null): string {
  if (avg == null) return "transparent";
  const intensity = Math.min(0.5, Math.abs(avg) / 8); // ~8% avg monthly return saturates
  const pctMix = Math.round((0.06 + intensity) * 100);
  return `color-mix(in srgb, var(${avg >= 0 ? "--up" : "--down"}) ${pctMix}%, transparent)`;
}

function Tile({
  label,
  value,
  tone,
  hint,
  info,
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
  hint?: string;
  info?: string;
}) {
  return (
    <div className="rounded-xl bg-panel p-3 shadow-sm shadow-black/5 ring-1 ring-panel-border">
      <div className="text-[11px] text-panel-fg/68">
        {label}
        {info && <InfoTip text={info} />}
      </div>
      <div
        className={`mt-0.5 text-lg font-semibold tabular-nums ${
          tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-panel-fg"
        }`}
      >
        {value}
      </div>
      {hint && <div className="mt-0.5 text-[10px] text-panel-fg/65">{hint}</div>}
    </div>
  );
}
