import "../lib/loadEnv";
import { sql } from "drizzle-orm";
import { createDb, dailyQuotes } from "@pseye/db";
import { PseEdgeQuoteSource } from "@pseye/source-quotes";

/**
 * Runs hourly during PSE trading hours (see .github/workflows/quotes-daily.yml)
 * and scrapes PSE Edge's public per-company pages — see PseEdgeQuoteSource's
 * doc comment for the caching/rate-limit reasoning and docs/PLANNING.md for the
 * legal tradeoffs behind that choice (Open Question #1).
 */
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const db = createDb(databaseUrl);
  const source = new PseEdgeQuoteSource();
  const quotes = await source.getDailyQuotes();

  const tradeDate = new Date().toISOString().slice(0, 10);

  const rows = quotes.map((quote) => ({
    ticker: quote.ticker,
    companyName: quote.companyName,
    tradeDate,
    price: quote.price == null ? null : quote.price.toString(),
    pctChange: quote.pctChange == null ? null : quote.pctChange.toString(),
    marketCap: quote.marketCap.toString(),
    sector: quote.sector,
  }));

  await db
    .insert(dailyQuotes)
    .values(rows)
    .onConflictDoUpdate({
      target: [dailyQuotes.ticker, dailyQuotes.tradeDate],
      set: {
        companyName: sql`excluded.company_name`,
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
