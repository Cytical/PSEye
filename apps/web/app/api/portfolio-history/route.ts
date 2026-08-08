import { getHistoricalQuotesLenient } from "@/lib/historicalQuotes";

/**
 * Backs the portfolio value-over-time chart. A visitor's holdings live in
 * localStorage, so unlike most pages this ticker list is only known in the
 * browser — same reasoning as /api/history for the DCA calculator.
 *
 * Uses getHistoricalQuotesLenient, not getHistoricalQuotes: this endpoint
 * feeds a chart of real ₱ values, so a ticker with no DB history is dropped
 * rather than the whole request falling back to a fabricated random walk (the
 * DCA calculator's mock fallback is fine there because it's clearly labeled
 * "sample data" for a single hypothetical stock; blending a synthetic series
 * into someone's actual portfolio value would be misleading).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tickersParam = searchParams.get("tickers");
  const fromDate = searchParams.get("from");

  if (!tickersParam || !fromDate) {
    return Response.json({ error: "tickers and from query params are required" }, { status: 400 });
  }

  const tickers = tickersParam.split(",").filter(Boolean);
  const result = await getHistoricalQuotesLenient(tickers, fromDate);

  return Response.json(result);
}
