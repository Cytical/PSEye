import { getDailyQuotes } from "@/lib/quotes";
import { getHistoricalQuotes } from "@/lib/historicalQuotes";

/**
 * Backs the DCA calculator's client-side ticker/date picker. Deliberately a
 * route handler rather than something the client fetches directly from PSE
 * Edge: real historical data lives in our own DB (populated by the daily
 * fetch-historical-quotes ETL job), so this only ever reads our own
 * database (or falls back to mock data) — never proxies a live PSE Edge
 * request per visitor interaction.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tickersParam = searchParams.get("tickers");
  const fromDate = searchParams.get("from");

  if (!tickersParam || !fromDate) {
    return Response.json({ error: "tickers and from query params are required" }, { status: 400 });
  }

  const tickers = tickersParam.split(",").filter(Boolean);
  const quotes = await getDailyQuotes();
  const history = await getHistoricalQuotes(tickers, fromDate, quotes);

  return Response.json(history);
}
