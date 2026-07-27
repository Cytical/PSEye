/**
 * "What day is it?" for a Philippines-focused site.
 *
 * Every date this app reasons about — ex-dates, subscription windows, trading
 * days, the /daily/[date] recap key — is a Manila calendar date, because
 * that's the timezone the exchange publishes in. Deriving today from
 * `new Date().toISOString().slice(0, 10)` instead answers the question in UTC,
 * which is Manila minus 8 hours: between 00:00 and 08:00 PHT every single day,
 * UTC still says yesterday.
 *
 * The visible symptom that turned this up: the dividend calendar showed a
 * ticker whose ex-date had already passed in Manila as "next ex-date … today",
 * and sorted it into the upcoming list rather than the past one, for the whole
 * of that eight-hour window.
 *
 * Fixed to Asia/Manila rather than the visitor's local timezone for the same
 * reason MarketSummaryBar's clock is: a reader in London asking "has this
 * gone ex-dividend yet?" wants the exchange's answer, not their own.
 */

const MANILA_PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Manila",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today's date in Manila, as the same `YYYY-MM-DD` string shape every date field in the DB uses. */
export function manilaToday(now: Date = new Date()): string {
  const parts = MANILA_PARTS.formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}`;
}
