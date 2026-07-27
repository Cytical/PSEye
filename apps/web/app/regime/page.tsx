import type { Metadata } from "next";
import Link from "next/link";
import { getMarketRegime, type Regime, type CurrentRegime, type RegimeStat } from "@/lib/marketRegime";
import { RegimeChart } from "@/components/RegimeChart";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "PSE Market Regime — Risk-On / Risk-Off Detection",
  description:
    "Is the Philippine Stock Exchange in a risk-on or risk-off regime? A transparent, rule-based classifier labels market history from trend, drawdown, and volatility of a reconstructed composite index. Free, no login.",
  alternates: { canonical: "/regime" },
};

const REGIME_LABEL: Record<Regime, string> = {
  "risk-on": "Risk-on",
  neutral: "Neutral",
  "risk-off": "Risk-off",
};

function regimeDot(regime: Regime): string {
  if (regime === "risk-on") return "var(--up)";
  if (regime === "risk-off") return "var(--down)";
  return "color-mix(in srgb, var(--panel-fg) 40%, transparent)";
}

function fmtDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function RegimePage() {
  const result = await getMarketRegime();

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Market Map", item: siteUrl },
          { "@type": "ListItem", position: 2, name: "Market Regime", item: `${siteUrl}/regime` },
        ],
      },
    ],
  };

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="text-xs text-panel-fg/50">
        <Link href="/" className="hover:underline">
          Market Map
        </Link>
        <span className="mx-1.5">/</span>
        <span>Market Regime</span>
      </nav>

      <p className="kicker mt-3 text-accent">Market Regime</p>
      <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-panel-fg sm:text-3xl">
        Risk-On / Risk-Off Detection
      </h1>
      <p className="mt-2 max-w-3xl text-sm leading-relaxed text-panel-fg/60">
        Markets alternate between calm uptrends (&ldquo;risk-on&rdquo;) and stressed downtrends
        (&ldquo;risk-off&rdquo;). This labels the PSE&apos;s history from three transparent signals of
        a reconstructed composite index — trend vs. its 200-day average, drawdown from the peak, and
        30-day volatility. A descriptive read of where the market <em>has been</em>, not a forecast.
      </p>

      {result.source !== "real" || !result.current ? (
        <div className="mt-8 rounded-xl bg-panel px-5 py-8 text-center shadow-sm shadow-black/5 ring-1 ring-panel-border">
          <p className="text-sm text-panel-fg/70">
            Regime detection needs a long history of daily closes, which isn&apos;t available in this
            environment yet. The page stays empty rather than label placeholder data.
          </p>
        </div>
      ) : (
        <>
          <CurrentRegimeCard current={result.current} asOf={result.asOf} />

          <section className="mt-8">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-serif text-lg font-semibold tracking-tight text-panel-fg">
                Composite index &amp; regimes
              </h2>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-panel-fg/55">
                {(["risk-on", "neutral", "risk-off"] as Regime[]).map((r) => (
                  <span key={r} className="flex items-center gap-1.5">
                    <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: regimeDot(r) }} aria-hidden="true" />
                    {REGIME_LABEL[r]}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-3 rounded-xl bg-panel p-4 shadow-sm shadow-black/5 ring-1 ring-panel-border">
              <RegimeChart points={result.points} />
              <p className="mt-1 text-[11px] text-panel-fg/45">
                Reconstructed cap-weighted composite (indexed to 100 at the series start) — a PSEi-like
                proxy, not the official index. Background shading is the detected regime.
              </p>
            </div>
          </section>

          <section className="mt-8">
            <h2 className="font-serif text-lg font-semibold tracking-tight text-panel-fg">
              Regime breakdown
            </h2>
            <p className="mt-1 max-w-3xl text-sm text-panel-fg/60">
              How much of the tracked history sat in each regime, and the composite&apos;s average
              daily move while there. Over this window the market was largely in a recovery uptrend,
              so the regimes separate more by trend and volatility than by the sign of returns — but
              risk-on still shows the strongest daily drift.
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {result.stats.map((s) => (
                <RegimeStatCard key={s.regime} stat={s} label={REGIME_LABEL[s.regime]} dot={regimeDot(s.regime)} />
              ))}
            </div>
          </section>

          <details className="mt-6 max-w-3xl rounded-xl bg-panel px-4 py-3 text-sm shadow-sm shadow-black/5 ring-1 ring-panel-border">
            <summary className="cursor-pointer font-medium text-panel-fg">How regimes are classified</summary>
            <div className="mt-2 flex flex-col gap-2 text-panel-fg/70">
              <p>
                <strong className="text-panel-fg/85">Risk-off</strong>: the index is below its 200-day
                average AND either down more than 10% from its peak or showing above-median 30-day
                volatility. <strong className="text-panel-fg/85">Risk-on</strong>: above the 200-day
                average, within 5% of the peak, and below-median volatility.{" "}
                <strong className="text-panel-fg/85">Neutral</strong>: everything in between.
              </p>
              <p>
                Labels are 5-day majority-smoothed to avoid single-day flip-flops. Rule-based and
                fully inspectable — no machine-learning black box — so every classification traces to
                the three signals above.
              </p>
            </div>
          </details>
        </>
      )}

      <p className="mt-8 max-w-3xl text-xs text-panel-fg/55">
        Delayed / end-of-day data, recomputed by PSEye. A descriptive classification of
        past market conditions — not a forecast, market-timing signal, or financial advice.
      </p>
    </div>
  );
}

function CurrentRegimeCard({ current, asOf }: { current: CurrentRegime; asOf: string | null }) {
  return (
    <div className="mt-6 rounded-xl bg-panel p-5 shadow-sm shadow-black/5 ring-1 ring-panel-border">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="inline-block h-4 w-4 rounded-full" style={{ backgroundColor: regimeDot(current.regime) }} aria-hidden="true" />
        <span className="font-serif text-xl font-semibold text-panel-fg">{REGIME_LABEL[current.regime]}</span>
        <span className="text-sm text-panel-fg/55">since {fmtDate(current.since)}</span>
        {asOf && <span className="ml-auto text-xs text-panel-fg/45">as of {asOf}</span>}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Signal
          label="Index vs 200-day avg"
          value={`${current.pctVs200 >= 0 ? "+" : ""}${current.pctVs200.toFixed(1)}%`}
          tone={current.pctVs200 >= 0 ? "up" : "down"}
          hint={current.pctVs200 >= 0 ? "uptrend" : "downtrend"}
        />
        <Signal
          label="Drawdown from peak"
          value={`${current.drawdown.toFixed(1)}%`}
          tone={current.drawdown <= -10 ? "down" : undefined}
        />
        <Signal
          label="30-day volatility"
          value={`${current.vol30.toFixed(0)}%`}
          hint={current.elevatedVol ? "elevated" : "subdued"}
          tone={current.elevatedVol ? "down" : undefined}
        />
        <Signal label="Composite level" value={current.level.toFixed(1)} hint="base = 100" />
      </div>
    </div>
  );
}

function RegimeStatCard({ stat, label, dot }: { stat: RegimeStat; label: string; dot: string }) {
  return (
    <div className="rounded-xl bg-panel p-4 shadow-sm shadow-black/5 ring-1 ring-panel-border">
      <div className="flex items-center gap-2">
        <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: dot }} aria-hidden="true" />
        <span className="text-sm font-medium text-panel-fg">{label}</span>
        <span className="ml-auto text-sm font-semibold tabular-nums text-panel-fg">{stat.pctTime.toFixed(0)}%</span>
      </div>
      <div className="mt-2 text-xs text-panel-fg/60">
        {stat.days} trading days · avg move{" "}
        <span className={stat.avgDailyReturn >= 0 ? "text-up" : "text-down"}>
          {stat.avgDailyReturn >= 0 ? "+" : ""}
          {stat.avgDailyReturn.toFixed(3)}%/day
        </span>
      </div>
    </div>
  );
}

function Signal({ label, value, tone, hint }: { label: string; value: string; tone?: "up" | "down"; hint?: string }) {
  return (
    <div className="rounded-lg bg-panel-raised/60 p-3">
      <div className="text-[11px] text-panel-fg/50">{label}</div>
      <div className={`mt-0.5 text-lg font-semibold tabular-nums ${tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-panel-fg"}`}>
        {value}
      </div>
      {hint && <div className="mt-0.5 text-[10px] text-panel-fg/45">{hint}</div>}
    </div>
  );
}
