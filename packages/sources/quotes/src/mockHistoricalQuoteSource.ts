import type { HistoricalClose, HistoricalQuoteSource } from "./types";
import { SAMPLE_QUOTES } from "./mockQuoteSource";

/**
 * Placeholder HistoricalQuoteSource until a real EOD price history feed is wired
 * in (same open question as MockQuoteSource). Generates a deterministic
 * pseudo-random daily-close series per ticker, rescaled so the most recent close
 * matches that ticker's current sample price. Swap via the HistoricalQuoteSource
 * interface, not by editing callers.
 */
export class MockHistoricalQuoteSource implements HistoricalQuoteSource {
  async getHistory(ticker: string, fromDate: string): Promise<HistoricalClose[]> {
    const anchor = SAMPLE_QUOTES.find((q) => q.ticker === ticker);
    if (!anchor) return [];

    const dates = businessDaysBetween(fromDate, todayIso());
    if (dates.length === 0) return [];

    const dailyDrift = 0.00025; // ~6%/yr, loosely PSEi-like long-run nominal drift
    const dailyVol = 0.013;

    let relative = 1;
    const relatives: number[] = [];
    for (const date of dates) {
      relative *= 1 + dailyDrift + dailyVol * pseudoNormal(`${ticker}:${date}`);
      relatives.push(relative);
    }

    const scale = anchor.price / relatives[relatives.length - 1];
    return dates.map((date, i) => ({ date, close: round2(relatives[i] * scale) }));
  }
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function businessDaysBetween(fromIso: string, toIso: string): string[] {
  const days: string[] = [];
  const cursor = new Date(fromIso + "T00:00:00Z");
  const end = new Date(toIso + "T00:00:00Z");
  while (cursor <= end) {
    const dow = cursor.getUTCDay();
    if (dow !== 0 && dow !== 6) days.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return days;
}

/** FNV-1a string hash to a uniform in [0, 1). */
function hashToUnit(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967296;
}

/** Deterministic approx-standard-normal via Box-Muller over two hash-derived uniforms. */
function pseudoNormal(seed: string): number {
  const u1 = Math.max(hashToUnit(seed + ":a"), Number.EPSILON);
  const u2 = hashToUnit(seed + ":b");
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
