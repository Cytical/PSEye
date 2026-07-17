import {
  pgTable,
  serial,
  text,
  date,
  timestamp,
  numeric,
  bigint,
  integer,
  varchar,
  unique,
} from "drizzle-orm/pg-core";

export const dailyQuotes = pgTable(
  "daily_quotes",
  {
    id: serial("id").primaryKey(),
    ticker: varchar("ticker", { length: 16 }).notNull(),
    companyName: text("company_name").notNull(),
    tradeDate: date("trade_date").notNull(),
    // Nullable: PSE Edge reports no price/change for a suspended ticker or one
    // with no trade yet today — that's an "N/A" in the UI, not a 0.
    price: numeric("price", { precision: 12, scale: 4 }),
    pctChange: numeric("pct_change", { precision: 8, scale: 4 }),
    // numeric, not bigint: PSE Edge reports market cap to the cent (fractional), not as a whole share count.
    marketCap: numeric("market_cap", { precision: 20, scale: 2 }),
    sector: varchar("sector", { length: 64 }).notNull(),
  },
  (table) => [unique().on(table.ticker, table.tradeDate)]
);

export const newsItems = pgTable("news_items", {
  id: serial("id").primaryKey(),
  source: varchar("source", { length: 64 }).notNull(),
  title: text("title").notNull(),
  snippet: text("snippet"),
  // Nullable: most outlets' RSS <enclosure>/media tags don't always carry one
  // (see extractImageUrl in packages/sources/news/src/rssSource.ts) — NewsCard's
  // Thumbnail already renders nothing when this is null, same as the live-fetch path.
  imageUrl: text("image_url"),
  url: text("url").notNull().unique(),
  imageUrl: text("image_url"),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
  tickers: text("tickers").array().notNull().default([]),
});

// Populated by a one-time backfill (etl/jobs/backfill-company-profiles.ts), not
// a scheduled job — a company's business description (sourced from its PSE
// Edge / SEC 17-A filing) changes rarely enough that a hand-triggered rerun
// beats an hourly/daily cadence. See apps/web/lib/companyProfiles.ts.
export const companyProfiles = pgTable("company_profiles", {
  id: serial("id").primaryKey(),
  ticker: varchar("ticker", { length: 16 }).notNull().unique(),
  description: text("description").notNull(),
  source: varchar("source", { length: 128 }).notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
});

// One row per calendar day, upserted on every hourly ETL run (see
// etl/jobs/fetch-market-snapshot.ts) — "the day's" PSEi/forex reading, not a
// full intraday history.
export const marketSnapshot = pgTable("market_snapshot", {
  id: serial("id").primaryKey(),
  snapshotDate: date("snapshot_date").notNull().unique(),
  pseiValue: numeric("psei_value", { precision: 12, scale: 4 }).notNull(),
  pseiChange: numeric("psei_change", { precision: 12, scale: 4 }).notNull(),
  pseiPctChange: numeric("psei_pct_change", { precision: 8, scale: 4 }).notNull(),
  usdPhpRate: numeric("usd_php_rate", { precision: 10, scale: 4 }).notNull(),
  capturedAt: timestamp("captured_at", { withTimezone: true }).notNull(),
});

export const indexForeignFlow = pgTable(
  "index_foreign_flow",
  {
    id: serial("id").primaryKey(),
    periodEnd: date("period_end").notNull().unique(),
    foreignBuyValue: bigint("foreign_buy_value", { mode: "number" }).notNull(),
    foreignSellValue: bigint("foreign_sell_value", { mode: "number" }).notNull(),
    netValue: bigint("net_value", { mode: "number" }).notNull(),
  }
);

export const stockForeignFlow = pgTable(
  "stock_foreign_flow",
  {
    id: serial("id").primaryKey(),
    periodEnd: date("period_end").notNull(),
    ticker: varchar("ticker", { length: 16 }).notNull(),
    companyName: text("company_name").notNull(),
    netValue: bigint("net_value", { mode: "number" }).notNull(),
    rank: integer("rank").notNull(),
  },
  (table) => [unique().on(table.periodEnd, table.ticker)]
);

export const offerings = pgTable(
  "offerings",
  {
    id: serial("id").primaryKey(),
    ticker: varchar("ticker", { length: 16 }),
    companyName: text("company_name").notNull(),
    sector: varchar("sector", { length: 64 }).notNull(),
    type: varchar("type", { length: 32 }).notNull(),
    offerPrice: numeric("offer_price", { precision: 12, scale: 4 }).notNull(),
    subscriptionStart: date("subscription_start").notNull(),
    subscriptionEnd: date("subscription_end").notNull(),
    listingDate: date("listing_date"),
    summary: text("summary").notNull(),
  },
  (table) => [unique().on(table.companyName, table.type, table.subscriptionStart)]
);

export const disclosures = pgTable("disclosures", {
  id: serial("id").primaryKey(),
  ticker: varchar("ticker", { length: 16 }).notNull(),
  companyName: text("company_name").notNull(),
  type: varchar("type", { length: 32 }).notNull(),
  headline: text("headline").notNull(),
  filedAt: timestamp("filed_at", { withTimezone: true }).notNull(),
  referenceNo: varchar("reference_no", { length: 64 }).notNull().unique(),
});

export const blockSales = pgTable(
  "block_sales",
  {
    id: serial("id").primaryKey(),
    ticker: varchar("ticker", { length: 16 }).notNull(),
    companyName: text("company_name").notNull(),
    tradeDate: date("trade_date").notNull(),
    volume: bigint("volume", { mode: "number" }).notNull(),
    price: numeric("price", { precision: 12, scale: 4 }).notNull(),
    value: bigint("value", { mode: "number" }).notNull(),
  },
  (table) => [unique().on(table.ticker, table.tradeDate, table.volume, table.price)]
);

export const corporateActions = pgTable(
  "corporate_actions",
  {
    id: serial("id").primaryKey(),
    ticker: varchar("ticker", { length: 16 }).notNull(),
    companyName: text("company_name").notNull(),
    type: varchar("type", { length: 32 }).notNull(),
    exDate: date("ex_date").notNull(),
    recordDate: date("record_date").notNull(),
    paymentDate: date("payment_date"),
    details: text("details").notNull(),
  },
  (table) => [unique().on(table.ticker, table.type, table.exDate)]
);

// Real daily closes from PSE Edge's per-company chart feed (see
// etl/jobs/fetch-historical-quotes.ts) — backs the DCA calculator's
// HistoricalQuoteSource instead of MockHistoricalQuoteSource's synthetic walk.
export const historicalQuotes = pgTable(
  "historical_quotes",
  {
    id: serial("id").primaryKey(),
    ticker: varchar("ticker", { length: 16 }).notNull(),
    tradeDate: date("trade_date").notNull(),
    close: numeric("close", { precision: 12, scale: 4 }).notNull(),
  },
  (table) => [unique().on(table.ticker, table.tradeDate)]
);
