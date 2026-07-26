import type { MarketSnapshot } from "@/lib/marketSnapshot";

interface BreadthQuote {
  pctChange: number | null;
  marketCap: number;
  value?: number | null;
}

interface MarketMapHeroProps {
  quotes: BreadthQuote[];
  snapshot: MarketSnapshot;
}

function formatUpdatedAt(capturedAt: string): string {
  return new Date(capturedAt).toLocaleTimeString("en-PH", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Manila",
  });
}

function formatPesoCompact(n: number): string {
  if (n >= 1_000_000_000_000) return `₱${(n / 1_000_000_000_000).toFixed(2)}T`;
  if (n >= 1_000_000_000) return `₱${(n / 1_000_000_000).toFixed(1)}B`;
  return `₱${(n / 1_000_000).toFixed(0)}M`;
}

/**
 * Approximate, computed at render time (this page revalidates hourly, so it
 * can't tick live client-side anyway — same tradeoff as every other
 * "Updated HH:MM" stamp on this page). PSE's core continuous trading session
 * is Mon-Fri 9:30am-3:30pm PHT; pre-open/trading-at-last minutes at the edges
 * are treated as closed since the badge is a rough "is it worth checking
 * back right now" signal, not a precise exchange-status feed.
 */
function getMarketStatus(): { open: boolean; label: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Manila",
    hour: "numeric",
    minute: "numeric",
    hourCycle: "h23",
    weekday: "short",
  }).formatToParts(new Date());
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const minutesOfDay = hour * 60 + minute;
  const isWeekday = weekday !== "Sat" && weekday !== "Sun";
  const isTradingHours = minutesOfDay >= 9 * 60 + 30 && minutesOfDay < 15 * 60 + 30;
  const open = isWeekday && isTradingHours;
  return { open, label: open ? "Market open" : "Market closed" };
}

/**
 * The homepage masthead: headline + a live-feeling PSEi ticker card and a
 * market-breadth strip (advancers/decliners/market cap/value traded), all
 * computed from data the page already fetched — no extra queries. Meant to
 * read as a trading-desk summary a first-time visitor takes in before they
 * even reach the treemap below, not just marketing copy over whitespace.
 */
export function MarketMapHero({ quotes, snapshot }: MarketMapHeroProps) {
  const withChange = quotes.filter((q): q is BreadthQuote & { pctChange: number } => q.pctChange !== null);
  const advancers = withChange.filter((q) => q.pctChange > 0).length;
  const decliners = withChange.filter((q) => q.pctChange < 0).length;
  const unchanged = withChange.length - advancers - decliners;
  const totalMarketCap = quotes.reduce((sum, q) => sum + q.marketCap, 0);
  const totalValue = quotes.reduce((sum, q) => sum + (q.value ?? 0), 0);
  const status = getMarketStatus();
  const pseiUp = snapshot.pseiChange >= 0;

  return (
    <div className="relative overflow-hidden">
      {/* Soft accent glow behind the masthead — the one deliberately
          "luxurious" flourish on the page, kept subtle (low opacity, heavily
          blurred) so it reads as ambient light rather than a gradient banner. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-96 w-[64rem] -translate-x-1/2 rounded-full opacity-[0.35] blur-3xl"
        style={{
          background:
            "radial-gradient(closest-side, color-mix(in srgb, var(--accent) 20%, transparent), transparent)",
        }}
      />

      <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2.5">
            <p className="kicker text-accent">Market Map</p>
            <span className="flex items-center gap-1.5 rounded-full border border-panel-border bg-panel px-2 py-0.5 text-[10px] font-medium text-panel-fg/70">
              <span
                className={`h-1.5 w-1.5 rounded-full ${status.open ? "animate-pulse bg-up" : "bg-panel-fg/30"}`}
              />
              {status.label}
            </span>
          </div>
          <h1 className="mt-2 font-serif text-[2.35rem] font-semibold leading-[1.05] tracking-tight sm:text-[3.25rem]">
            The Philippine Stock Market, <span className="italic text-accent">Visualized.</span>
          </h1>
          <p className="mt-3.5 max-w-xl text-[15px] leading-relaxed text-foreground/65 sm:text-base">
            Every listed company on the PSE, sized by market capitalization and colored by
            today&apos;s move, grouped by sector — free and refreshed through the trading day. No
            login, no paywall.
          </p>
        </div>

        <div className="shrink-0 rounded-2xl bg-panel px-6 py-4 text-right shadow-lg shadow-black/10 ring-1 ring-panel-border sm:min-w-[230px]">
          <div className="kicker text-panel-fg/50">PSEi</div>
          <div className="mt-1 font-serif text-4xl font-semibold tabular-nums tracking-tight text-panel-fg">
            {snapshot.pseiValue.toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>
          <div className={`mt-0.5 text-sm font-semibold tabular-nums ${pseiUp ? "text-up" : "text-down"}`}>
            {pseiUp ? "+" : ""}
            {snapshot.pseiChange.toFixed(2)} ({pseiUp ? "+" : ""}
            {snapshot.pseiPctChange.toFixed(2)}%)
          </div>
          <div className="mt-1 text-[10px] text-panel-fg/40">
            Updated {formatUpdatedAt(snapshot.capturedAt)} PHT
          </div>
        </div>
      </div>

      <div className="relative mt-7 flex flex-wrap items-baseline gap-x-8 gap-y-3 border-y border-foreground/10 py-3.5">
        <BreadthStat label="Advancers" value={advancers} tone="up" />
        <BreadthStat label="Decliners" value={decliners} tone="down" />
        <BreadthStat label="Unchanged" value={unchanged} />
        <BreadthStat label="Market cap" value={formatPesoCompact(totalMarketCap)} />
        <BreadthStat label="Value traded" value={formatPesoCompact(totalValue)} />
      </div>
    </div>
  );
}

function BreadthStat({ label, value, tone }: { label: string; value: string | number; tone?: "up" | "down" }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="kicker text-foreground/45">{label}</span>
      <span
        className={`text-base font-semibold tabular-nums ${
          tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-foreground"
        }`}
      >
        {value}
      </span>
    </div>
  );
}
