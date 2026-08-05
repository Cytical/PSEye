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
import { Kpi } from "./Kpi";
import { SubHead } from "./StockAnalytics";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface DividendSummary {
  /** Trailing-12-month dividend yield (%), or null when unknown/none. */
  yieldPct: number | null;
  /** Trailing-12-month cash dividend total, ₱/share. */
  ttm: number;
  /** How many trailing-12-month payouts were parsed. */
  payoutCount: number;
}

/** How many daily closes the panel is describing — the dashboard shows this as
 * the Panel's header meta, so it needs to be readable without mounting the
 * body. Returns null when there isn't enough history for `StockStatistics` to
 * render at all, which is also the page's gate for showing the panel. */
export function statisticsSampleSize(closes: HistoricalClose[]): number | null {
  const n = dailyReturns(closes.map((c) => c.close)).length;
  return n < 30 ? null : n + 1;
}

/**
 * Static server-rendered "advanced statistics" profile (zero client JS) — the
 * data-science layer PH retail tools don't surface: risk-adjusted return, the
 * full daily-return distribution (shape + tail risk), and income yield.
 * Everything is close-based, computed from the ~1yr of closes the stock page
 * already holds (plus dividend data it already fetched), so no extra queries.
 *
 * Renders the panel *body* only — see StockAnalytics for why. Seasonality used
 * to live here too but is now its own full-width `StockSeasonality` panel: a
 * 12-column table was the one thing in here that couldn't be read in a
 * dashboard-height column, and it's explicitly the most descriptive (least
 * actionable) block on the page, so it belongs below the fold rather than
 * forcing the whole risk profile down there with it.
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

  const showIncome = dividend != null && (dividend.yieldPct != null || dividend.payoutCount > 0);

  return (
    <div className="grid grid-cols-1 items-start gap-x-5 gap-y-3 xl:grid-cols-[minmax(0,1fr)_minmax(190px,225px)]">
      <div className="flex min-w-0 flex-col gap-3">
        <div>
          <SubHead>Risk-adjusted return</SubHead>
          <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-2.5 sm:grid-cols-4">
            <Kpi
              label="Annualized"
              value={annReturn == null ? "N/A" : pct(annReturn)}
              tone={toneOf(annReturn)}
              hint="CAGR"
              info="Compound annual growth rate implied by the closing-price series over this window."
            />
            <Kpi
              label="Sharpe"
              value={sharpe == null ? "N/A" : sharpe.toFixed(2)}
              tone={toneOf(sharpe)}
              hint="per unit risk"
              info="Excess return over the risk-free rate, divided by total volatility. Higher is better; above 1 is generally considered good, above 2 very good."
              glossaryId="sharpe-ratio"
            />
            <Kpi
              label="Sortino"
              value={sortino == null ? "N/A" : sortino.toFixed(2)}
              tone={toneOf(sortino)}
              hint="per unit downside"
              info="Like the Sharpe ratio, but it only penalizes downside volatility (losses), not upside swings. A stock that only ever surprises to the upside scores better here than on Sharpe."
              glossaryId="sortino-ratio"
            />
            <Kpi
              label="Downside dev."
              value={downDevAnnPct == null ? "N/A" : `${downDevAnnPct.toFixed(1)}%`}
              hint="losses only"
              info="Standard deviation of returns below the risk-free rate: volatility from losing days only, ignoring upside swings."
            />
          </div>
        </div>

        <div>
          <SubHead>Daily return distribution</SubHead>
          <div className="mt-1.5 grid grid-cols-2 gap-x-3 gap-y-2.5 sm:grid-cols-4">
            <Kpi label="Avg daily" value={pct2(avgDaily)} tone={toneOf(avgDaily)} />
            <Kpi label="Positive days" value={posDays == null ? "N/A" : `${posDays.toFixed(0)}%`} />
            <Kpi label="Best day" value={pct(best)} tone="up" />
            <Kpi label="Worst day" value={pct(worst)} tone="down" />
            <Kpi
              label="Skewness"
              value={skew == null ? "N/A" : skew.toFixed(2)}
              hint={skew == null ? undefined : skew > 0.1 ? "right tail" : skew < -0.1 ? "left tail" : "symmetric"}
              info="Asymmetry of the daily-return distribution. Positive means occasional large up days pull the tail right; negative means occasional large down days pull it left."
            />
            <Kpi
              label="Excess kurtosis"
              value={kurt == null ? "N/A" : kurt.toFixed(2)}
              hint={kurt == null ? undefined : kurt > 1 ? "fat tails" : "near-normal"}
              info={
                'How much more often extreme daily moves happen versus a normal distribution. Higher means more "fat tail" surprise days than a bell curve would predict.'
              }
            />
            <Kpi
              label="VaR (95%)"
              value={var95 == null ? "N/A" : `−${var95.toFixed(1)}%`}
              tone="down"
              hint="worst 5% of days"
              info="Historical VaR: read directly off the actual return distribution, not a normal-model estimate. On the worst 5% of days in this window, the loss was at least this large."
              glossaryId="value-at-risk"
            />
            <Kpi
              label="VaR (99%)"
              value={var99 == null ? "N/A" : `−${var99.toFixed(1)}%`}
              tone="down"
              hint="worst 1% of days"
              info="Same as VaR (95%), but for the worst 1% of days: a rarer, larger loss threshold."
              glossaryId="value-at-risk"
            />
          </div>
        </div>

      </div>

      {/* Right column: the histogram, then Income beneath it. Income used to
          sit under the distribution KPIs on the left, which left this column
          as one tall, mostly-empty raised box — the exact dead space this
          dashboard layout exists to remove. The box now hugs the chart. */}
      <div className="flex min-w-0 flex-col gap-3">
        <div>
          <SubHead>Return histogram</SubHead>
          <div className="mt-1.5 rounded-lg bg-panel-raised p-2 ring-1 ring-panel-border">
            {/* Narrow viewBox + larger in-box font: this column renders ~215px
                wide, where the default 640-wide box would shrink axis labels to
                an unreadable ~3.6px. */}
            <ReturnHistogram returns={returns} width={300} height={200} fontSize={13} tickCount={3} binCount={25} />
          </div>
        </div>

        {showIncome && (
          <div>
            <SubHead>Income</SubHead>
            <div className="mt-1.5 grid grid-cols-3 gap-x-3 gap-y-2.5">
              <Kpi
                label="Yield (TTM)"
                value={dividend.yieldPct == null ? "N/A" : `${dividend.yieldPct.toFixed(2)}%`}
                tone={dividend.yieldPct != null && dividend.yieldPct > 0 ? "up" : undefined}
              />
              <Kpi label="Dividends" value={`₱${dividend.ttm.toFixed(4).replace(/\.?0+$/, "")}`} hint="TTM" />
              <Kpi label="Payouts" value={String(dividend.payoutCount)} hint="TTM" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Average return by calendar month. Split out of `StockStatistics` so it can
 * sit full-width below the dashboard fold — 12 columns never read well inside
 * a dashboard-height column, and by its own caveat this is descriptive color
 * rather than something to trade on.
 */
export function StockSeasonality({ closes }: { closes: HistoricalClose[] }) {
  const monthly = monthlyReturnStats(closes);
  if (monthly.filter((m) => m.avgReturn != null).length < 6) return null;
  const maxYears = Math.max(0, ...monthly.map((m) => m.years));

  return (
    <div>
      <div className="grid grid-cols-6 gap-1.5 sm:grid-cols-12">
        {monthly.map((m) => (
          <div
            key={m.month}
            className="rounded-md px-1 py-1.5 text-center"
            style={{ backgroundColor: seasonColor(m.avgReturn) }}
            title={
              m.avgReturn == null
                ? `${MONTH_LABELS[m.month - 1]}: no data`
                : `${MONTH_LABELS[m.month - 1]}: ${pct(m.avgReturn)} avg over ${m.years} ${m.years === 1 ? "year" : "years"}`
            }
          >
            <div className="text-[10px] text-panel-fg/68">{MONTH_LABELS[m.month - 1]}</div>
            <div className="text-xs font-semibold tabular-nums text-panel-fg">
              {m.avgReturn == null ? "N/A" : `${m.avgReturn >= 0 ? "+" : ""}${m.avgReturn.toFixed(1)}`}
            </div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-panel-fg/65">
        Average % return by calendar month, up to {maxYears} {maxYears === 1 ? "year" : "years"} of history.
        Only a few years back each month, so this is descriptive color, not a predictable
        &ldquo;month effect.&rdquo;
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
