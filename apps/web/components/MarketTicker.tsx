import Link from "next/link";
import { PSEI_TICKERS } from "@pseye/source-quotes";
import { getDailyQuotes } from "@/lib/quotes";

interface TickerQuote {
  ticker: string;
  price: number;
  pctChange: number;
}

const PSEI_TICKER_SET = new Set(PSEI_TICKERS);

/** Fallback size when PSEi membership can't be resolved — see pickTapeQuotes. */
const FALLBACK_COUNT = 30;

/**
 * The tape shows the PSEi constituents, biggest first — not every tracked
 * company.
 *
 * Running the whole roster through it was self-defeating. Measured live: 202
 * tickers had a price, which at the deliberately-readable ~3.5s per item made
 * one full loop 707 seconds — 11.8 minutes — and because the list was sorted
 * alphabetically the tape always opened on AB, ABA, ABG, ABS and only reached
 * the last name after 11.1 minutes. So the strip a visitor actually saw was a
 * fixed handful of micro caps, and SM, BDO, TEL and ALI were effectively never
 * on screen. A ticker tape exists to give the market's pulse at a glance;
 * eleven minutes to cycle is the opposite of that.
 *
 * The PSEi is the headline index and the conventional thing for a tape to
 * carry, and market-cap order puts the names people recognise first. The full
 * roster is still one click away on the market map, /stocks and /screener.
 */
function pickTapeQuotes<T extends { ticker: string; marketCap: number }>(quotes: T[]): T[] {
  const constituents = quotes.filter((q) => PSEI_TICKER_SET.has(q.ticker));
  // If the roster and the index list ever drift apart far enough that almost
  // nothing matches, fall back to the largest companies by market cap rather
  // than rendering an empty or near-empty strip.
  const chosen = constituents.length >= 10 ? constituents : quotes.slice(0, FALLBACK_COUNT);
  return [...chosen].sort((a, b) => b.marketCap - a.marketCap);
}

function changeColor(n: number): string {
  return n >= 0 ? "text-up" : "text-down";
}

function TickerItem({ q, hidden }: { q: TickerQuote; hidden?: boolean }) {
  return (
    <Link
      href={`/stocks/${q.ticker}`}
      aria-hidden={hidden || undefined}
      tabIndex={hidden ? -1 : undefined}
      className="flex shrink-0 items-center gap-1.5 border-r border-panel-fg/10 px-4 py-1.5 hover:bg-panel-raised/60"
    >
      <span className="font-mono text-xs font-semibold text-panel-fg">{q.ticker}</span>
      <span className="text-xs tabular-nums text-panel-fg/72">₱{q.price.toFixed(2)}</span>
      <span className={`flex items-center gap-0.5 text-xs font-semibold tabular-nums ${changeColor(q.pctChange)}`}>
        {q.pctChange >= 0 ? "▲" : "▼"}
        {Math.abs(q.pctChange).toFixed(2)}%
      </span>
    </Link>
  );
}

/**
 * Bloomberg/CNBC-style scrolling ticker tape at the very top of every page —
 * a pure-CSS marquee (@keyframes ticker-scroll in globals.css), so this stays
 * a plain Server Component with no client JS. The row is rendered twice back
 * to back and the track animates exactly -50%, so the second copy slides
 * into the first's starting position with no visible seam or reset-jump; the
 * duplicate is aria-hidden/untabbable so assistive tech and keyboard nav only
 * see each ticker once. `group-hover:` pauses the scroll so a visitor can
 * actually click a ticker instead of chasing it. Reduced-motion is handled
 * by the sitewide rule in globals.css, not per-component.
 */
export async function MarketTicker() {
  const quotes = await getDailyQuotes();
  const withPrice = quotes.filter(
    (q): q is typeof q & { price: number; pctChange: number } => q.price != null && q.pctChange != null,
  );
  // Ordered by market cap inside pickTapeQuotes, so the tape opens on the
  // names a visitor recognises rather than whatever sorts first alphabetically.
  const tape = pickTapeQuotes(withPrice);

  if (tape.length === 0) return null;

  // Scroll speed (px/s) stays roughly constant as the constituent list changes
  // rather than the whole loop just taking longer to notice — duration scales
  // with item count instead of being a fixed value. ~3.5s/item settled at a
  // comfortably readable pace (the original 1.1s/item read as a blur of
  // numbers rather than a ticker you could actually track). With the PSEi's
  // ~30 names that puts a full cycle at the 120s floor, so everything on the
  // tape comes round about every two minutes instead of every twelve.
  const duration = Math.max(120, Math.round(tape.length * 3.5));

  return (
    <div
      role="region"
      aria-label="PSEi constituent price ticker"
      className="group overflow-hidden border-b border-foreground/10 bg-panel-raised"
    >
      <div
        // focus-within pauses for the same reason group-hover does: a keyboard
        // user tabbing into a ticker link can't "hover" to stop the scroll, so
        // without this the link they're focused on slides out from under them.
        className="flex w-max animate-[ticker-scroll_120s_linear_infinite] group-hover:[animation-play-state:paused] focus-within:[animation-play-state:paused]"
        style={{ animationDuration: `${duration}s` }}
      >
        {tape.map((q) => (
          <TickerItem key={`${q.ticker}-a`} q={q} />
        ))}
        {tape.map((q) => (
          <TickerItem key={`${q.ticker}-b`} q={q} hidden />
        ))}
      </div>
    </div>
  );
}
