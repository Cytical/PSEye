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
    // PSE Edge's "Free Float Level(%)", 0-100. Nullable: not every scrape/source
    // populates it (see @pseye/treemap-layout's floatAdjustedMarketCap, which
    // falls back to raw marketCap when this is null).
    freeFloatPct: numeric("free_float_pct", { precision: 6, scale: 3 }),
    // Today's traded shares and ₱ turnover. Nullable for the same reason as
    // price/pctChange (suspended ticker, no trade yet today) — see
    // apps/web/lib/volumeLeaders.ts for how these back the "most active" ranking.
    volume: bigint("volume", { mode: "number" }),
    value: numeric("value", { precision: 20, scale: 2 }),
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
  // 2026-07: fetch-news.ts now backfills this with a per-article og:image scrape,
  // then that outlet's own logo (see newsOutletLogos below), before finally
  // leaving it null for NewsThumbnail's initials-card placeholder — so "null"
  // now means all three of those came up empty, not just "RSS had nothing".
  imageUrl: text("image_url"),
  url: text("url").notNull().unique(),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
  tickers: text("tickers").array().notNull().default([]),
  // 'positive' | 'negative' | 'neutral' — lexicon word-count sentiment over
  // title+snippet, computed once at fetch time (see scoreSentiment in
  // packages/sources/news/src/sentiment.ts, called from rssSource.ts) and
  // persisted rather than recomputed on every /news render. Nullable: rows
  // written before this column existed haven't been re-scored yet (they get
  // backfilled the next time fetch-news.ts's onConflictDoUpdate sees that
  // same URL again, same "backfill on next natural re-fetch" pattern as
  // image_url above) — apps/web/lib/news.ts's aggregates treat null the same
  // as 'neutral'.
  sentiment: varchar("sentiment", { length: 8 }),
});

// One row per outlet (keyed by the same `source` string as news_items.source
// / NewsSource.name), caching that outlet's logo URL so fetch-news.ts's
// per-article image fallback chain (RSS -> og:image -> outlet logo -> initials
// placeholder, see newsItems.imageUrl's comment above) only ever looks the
// logo up once per outlet, not once per article with a missing image — a
// news outlet's own logo essentially never changes, so there's no periodic
// refresh here, just lookup-if-missing (see fetchOutletLogo in
// packages/sources/news/src/outletLogo.ts).
export const newsOutletLogos = pgTable("news_outlet_logos", {
  source: varchar("source", { length: 64 }).primaryKey(),
  logoUrl: text("logo_url").notNull(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
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
    /** Link to the real PSE Edge company page for offerings with a real ticker; null otherwise. */
    url: text("url"),
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
  /** Link to the real PSE Edge filing detail view; null for rows inserted before this column existed. */
  url: text("url"),
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

// One row per trading day the X/Twitter bot has posted a market-map screenshot
// + recap reply (see etl/jobs/post-daily-tweet.ts) — the natural-key guard
// against posting twice for the same day if the workflow is re-run (manual
// workflow_dispatch, a retried step), without spending X API read quota on a
// duplicate check.
export const botPosts = pgTable("bot_posts", {
  id: serial("id").primaryKey(),
  postDate: date("post_date").notNull().unique(),
  tweetId: varchar("tweet_id", { length: 32 }).notNull(),
  replyTweetId: varchar("reply_tweet_id", { length: 32 }),
  postedAt: timestamp("posted_at", { withTimezone: true }).notNull(),
});
