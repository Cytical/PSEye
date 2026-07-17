import type { HistoricalClose } from "../types";

interface ChartPoint {
  CHART_DATE: string; // "Jul 01, 2026 00:00:00"
  CLOSE: number;
}

const MONTHS: Record<string, number> = {
  Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
  Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11,
};

/** "Jul 01, 2026 00:00:00" -> "2026-07-01". Time is always midnight (a date, not an instant). */
function parseChartDate(raw: string): string | null {
  const m = raw.trim().match(/^(\w{3})\s+(\d{1,2}),\s+(\d{4})/);
  if (!m) return null;
  const month = MONTHS[m[1]];
  if (month === undefined) return null;
  const d = new Date(Date.UTC(Number(m[3]), month, Number(m[2])));
  return d.toISOString().slice(0, 10);
}

/**
 * Parses `/common/DisclosureCht.ax`'s response — the same endpoint PSE
 * Edge's own per-company "Stock Data" page calls to draw its teechart price
 * chart (see `getDiscData()` in that page's inline script). Only `chartData`
 * (real daily OPEN/HIGH/LOW/CLOSE/VALUE) is used; `tableData` is a parallel
 * feed of disclosure headlines meant to annotate the chart, not price data.
 *
 * The endpoint itself repeats roughly one date per month (same CLOSE both
 * times — confirmed across multiple tickers, not a per-company data
 * conflict), which without deduping here fails every downstream
 * `onConflictDoUpdate` insert with "ON CONFLICT DO UPDATE command cannot
 * affect row a second time" as soon as two same-date rows land in one
 * batch. Dedupe by date (last write wins, values match anyway) before
 * returning.
 */
export function parseChartDataJson(jsonText: string): HistoricalClose[] {
  let body: unknown;
  try {
    body = JSON.parse(jsonText);
  } catch {
    return [];
  }

  const points = (body as { chartData?: ChartPoint[] })?.chartData;
  if (!Array.isArray(points)) return [];

  const byDate = new Map<string, number>();
  for (const p of points) {
    const date = parseChartDate(p.CHART_DATE ?? "");
    if (!date || typeof p.CLOSE !== "number" || !Number.isFinite(p.CLOSE)) continue;
    byDate.set(date, p.CLOSE);
  }
  return Array.from(byDate, ([date, close]) => ({ date, close })).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
}

/** Pulls `security_id` from stockData.do's own security dropdown (`<option value="…" selected>`). */
export function parseSecurityId(stockDataHtml: string): string | null {
  const m = stockDataHtml.match(/name="security_id"[\s\S]*?<option value="(\d+)"\s+selected/);
  return m ? m[1] : null;
}
