import Link from "next/link";
import { getDailyQuotes } from "@/lib/quotes";

interface TickerQuote {
  ticker: string;
  price: number;
  pctChange: number;
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
  const withPrice = quotes
    .filter((q): q is typeof q & { price: number; pctChange: number } => q.price != null && q.pctChange != null)
    .sort((a, b) => a.ticker.localeCompare(b.ticker));

  if (withPrice.length === 0) return null;

  // Scroll speed (px/s) stays roughly constant as the roster grows rather
  // than the whole loop just taking longer to notice — duration scales with
  // item count instead of being a fixed value tuned for today's ~282 tickers.
  // ~3.5s/item settled at a comfortably readable pace (the original 1.1s/item
  // read as a blur of numbers rather than a ticker you could actually track).
  const duration = Math.max(120, Math.round(withPrice.length * 3.5));

  return (
    <div
      role="region"
      aria-label="Live stock ticker"
      className="group overflow-hidden border-b border-foreground/10 bg-panel-raised"
    >
      <div
        // focus-within pauses for the same reason group-hover does: a keyboard
        // user tabbing into a ticker link can't "hover" to stop the scroll, so
        // without this the link they're focused on slides out from under them.
        className="flex w-max animate-[ticker-scroll_120s_linear_infinite] group-hover:[animation-play-state:paused] focus-within:[animation-play-state:paused]"
        style={{ animationDuration: `${duration}s` }}
      >
        {withPrice.map((q) => (
          <TickerItem key={`${q.ticker}-a`} q={q} />
        ))}
        {withPrice.map((q) => (
          <TickerItem key={`${q.ticker}-b`} q={q} hidden />
        ))}
      </div>
    </div>
  );
}
