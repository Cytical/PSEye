import { sql } from "drizzle-orm";
import { createDb, dailyQuotes } from "@pseye/db";
import { MockQuoteSource } from "@pseye/source-quotes";

/**
 * Runs once daily after PSE market close (see .github/workflows/quotes-daily.yml).
 * Swap MockQuoteSource for a real QuoteSource implementation once Open Question #1
 * (a legally-sound, full-coverage price feed) is resolved — nothing else here changes.
 */
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const db = createDb(databaseUrl);
  const source = new MockQuoteSource();
  const quotes = await source.getDailyQuotes();

  const tradeDate = new Date().toISOString().slice(0, 10);

  const rows = quotes.map((quote) => ({
    ticker: quote.ticker,
    tradeDate,
    price: quote.price.toString(),
    pctChange: quote.pctChange.toString(),
    marketCap: quote.marketCap,
    sector: quote.sector,
  }));

  await db
    .insert(dailyQuotes)
    .values(rows)
    .onConflictDoUpdate({
      target: [dailyQuotes.ticker, dailyQuotes.tradeDate],
      set: {
        price: sql`excluded.price`,
        pctChange: sql`excluded.pct_change`,
        marketCap: sql`excluded.market_cap`,
        sector: sql`excluded.sector`,
      },
    });

  console.log(`Upserted ${rows.length} quotes for ${tradeDate}`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
