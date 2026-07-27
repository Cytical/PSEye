/**
 * Whether the PSE's core continuous trading session is running right now.
 *
 * Mon-Fri 9:30am-3:30pm PHT. The pre-open auction and the trading-at-last
 * minutes at the edges are deliberately counted as closed: this is a rough
 * "is it worth checking back right now" signal, not a precise exchange-status
 * feed, and claiming open during an auction window would overstate it.
 *
 * Pure and time-injectable so it can be unit tested and so the badge can
 * recompute it in the browser — see MarketStatusBadge. It used to live inline
 * in app/page.tsx, where it was evaluated once per ISR render on a route
 * cached for an hour, meaning the homepage could keep saying "Market open" for
 * up to an hour after the 3:30pm close.
 */
export interface MarketStatus {
  open: boolean;
  label: string;
}

const MANILA_PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Manila",
  hour: "numeric",
  minute: "numeric",
  hourCycle: "h23",
  weekday: "short",
});

const OPEN_MINUTE = 9 * 60 + 30;
const CLOSE_MINUTE = 15 * 60 + 30;

export function getMarketStatus(now: Date = new Date()): MarketStatus {
  const parts = MANILA_PARTS.formatToParts(now);
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const minutesOfDay = hour * 60 + minute;

  const isWeekday = weekday !== "Sat" && weekday !== "Sun";
  const isTradingHours = minutesOfDay >= OPEN_MINUTE && minutesOfDay < CLOSE_MINUTE;
  const open = isWeekday && isTradingHours;

  return { open, label: open ? "Market open" : "Market closed" };
}
