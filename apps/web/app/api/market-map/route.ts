import { NextRequest, NextResponse } from "next/server";
import { getQuoteDates, getQuotesForDate } from "@/lib/quotesByDate";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Backs the market map's time machine (MarketMap.tsx). Same client-fetch
 * shape as /api/history: the `/` page must stay statically generated, so a
 * `?date=` deep link can't be read server-side (searchParams would flip the
 * whole route dynamic — see CLAUDE.md's opengraph-image note); the client
 * reads the param and fetches the past day's real recorded quotes here.
 *
 * GET /api/market-map          -> { dates: string[] }   (available trade dates, newest first)
 * GET /api/market-map?date=... -> { date, stocks }      (that day's full quote set, 404 if unrecorded)
 */
export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");

  if (date === null) {
    const dates = await getQuoteDates();
    return NextResponse.json(
      { dates },
      { headers: { "Cache-Control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=600" } }
    );
  }

  if (!DATE_RE.test(date)) {
    return NextResponse.json({ error: "Expected date=YYYY-MM-DD" }, { status: 400 });
  }

  const stocks = await getQuotesForDate(date);
  if (!stocks) {
    return NextResponse.json({ error: `No quotes recorded for ${date}` }, { status: 404 });
  }

  // Past sessions never change; let the CDN keep them for a day.
  return NextResponse.json(
    { date, stocks },
    { headers: { "Cache-Control": "public, max-age=0, s-maxage=86400, stale-while-revalidate=3600" } }
  );
}
