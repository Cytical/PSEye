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
  jsonb,
} from "drizzle-orm/pg-core";

/** One board/management row parsed from PSE Edge's "Directors and
 * Management" page — see parseDirectorsAndManagement.ts. */
export interface CompanyPersonRow {
  position: string;
  name: string;
}

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
  // The article's byline, straight from the feed's dc:creator (see
  // extractAuthor in packages/sources/news/src/rssSource.ts). Nullable for
  // two distinct reasons that look the same here: the outlet publishes no
  // author field at all (Philstar, GMA and Manila Bulletin don't), or it
  // published a CMS placeholder like "admin" that extractAuthor rejects.
  // Frequently a wire service ("Reuters") rather than a person.
  author: varchar("author", { length: 128 }),
  // Which desk the story files under — one of NEWS_TOPICS or the
  // "General Business" fallback (see classifyTopic in
  // packages/sources/news/src/topics.ts). Derived from title+snippet at
  // fetch time, NOT from the feed's own <category> tags, which half the
  // configured outlets either omit or set to the constant string "Business".
  // Nullable on the same "written before this column existed, backfills on
  // the next natural re-fetch" basis as image_url and sentiment above.
  topic: varchar("topic", { length: 32 }),
  // Words in the full article body, present only for the feeds that ship
  // content:encoded. Backs the "N min read" label; null means "the feed gave
  // us only a lede", and the UI omits the estimate rather than computing a
  // meaningless one off 340 characters.
  wordCount: integer("word_count"),
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
  // Everything below is nullable: parsed from the same PSE Edge company info
  // page's "Security Information"/"Contact Information" tables (see
  // parseCompanyInfoHtml) or Wikipedia's summary API — both best-effort, so a
  // company missing one shouldn't block storing the rest. See
  // etl/jobs/backfill-company-profiles.ts and apps/web/lib/companyProfiles.ts.
  businessAddress: text("business_address"),
  website: varchar("website", { length: 256 }),
  incorporationDate: varchar("incorporation_date", { length: 64 }),
  numberOfDirectors: integer("number_of_directors"),
  externalAuditor: varchar("external_auditor", { length: 256 }),
  fiscalYearEnd: varchar("fiscal_year_end", { length: 32 }),
  // Self-contained `data:image/webp;base64,...` URI, not a link back to
  // PSE Edge (see parseCompanyInfoHtml's doc comment on why the source URL
  // itself is read off the page rather than constructed from ticker/cmpy_id).
  // The raw source images are almost always a small mark on a large uniform
  // white canvas (e.g. Jollibee's logo is 614x600 with the mascot occupying
  // a small fraction of it) — 2026-08's backfill fetches the image and runs
  // it through sharp's trim() to crop that padding away before storing it,
  // since object-fit:contain alone can't fix a logo where the real content
  // is a few percent of the frame. text, not varchar, since a data URI runs
  // well past 512 chars.
  logoImage: text("logo_image"),
  // Board of Directors / Management Officers rosters from PSE Edge's own
  // "Directors and Management" tab (`/companyPage/directors_and_management_list.do`)
  // — a separate page from the one everything else on this table is sourced
  // from, fetched alongside it in the same backfill. Variable-length lists
  // with no fixed field set (position titles vary freely per company), hence
  // jsonb rather than flat columns. Empty array, not null, when a company has
  // no roster on file — same array-shaped absence as everything else here.
  boardOfDirectors: jsonb("board_of_directors").$type<CompanyPersonRow[]>().notNull().default([]),
  managementOfficers: jsonb("management_officers").$type<CompanyPersonRow[]>().notNull().default([]),
  // High-confidence auto-matched Wikipedia summary only (see
  // fetchWikipediaSummary's doc comment) — absent, not a guess, when no
  // confident match was found.
  wikipediaTitle: varchar("wikipedia_title", { length: 256 }),
  wikipediaSummary: text("wikipedia_summary"),
  wikipediaUrl: varchar("wikipedia_url", { length: 512 }),
});

// One row per ticker: the latest Annual Balance Sheet + Income Statement from
// PSE Edge's own "Financial Reports" tab (current fiscal year vs previous —
// the same two-column shape that page itself shows, no deeper multi-year
// history kept). Populated by the manual backfill in
// etl/jobs/backfill-company-financials.ts (same once-a-year-changes reasoning
// as company_profiles above, not a recurring ETL job). Every numeric column
// is nullable — a company can be missing an individual line item, or the
// whole row can be absent for one that's never filed. See
// apps/web/lib/companyFinancials.ts and
// packages/sources/quotes/src/pseEdge/parseFinancialReports.ts.
export const companyFinancials = pgTable("company_financials", {
  id: serial("id").primaryKey(),
  ticker: varchar("ticker", { length: 16 }).notNull().unique(),
  fetchedAt: timestamp("fetched_at", { withTimezone: true }).notNull(),
  // PSE Edge's own phrasing, e.g. "Dec 31, 2025" / "PhP (in Millions)" — kept
  // as strings rather than parsed/normalized, since units vary per company
  // (see parseFinancialReports.ts's doc comment on why).
  fiscalYearEnded: varchar("fiscal_year_ended", { length: 32 }),
  currencyUnit: varchar("currency_unit", { length: 64 }),

  currentAssetsCurrent: numeric("current_assets_current", { precision: 20, scale: 4 }),
  currentAssetsPrevious: numeric("current_assets_previous", { precision: 20, scale: 4 }),
  totalAssetsCurrent: numeric("total_assets_current", { precision: 20, scale: 4 }),
  totalAssetsPrevious: numeric("total_assets_previous", { precision: 20, scale: 4 }),
  currentLiabilitiesCurrent: numeric("current_liabilities_current", { precision: 20, scale: 4 }),
  currentLiabilitiesPrevious: numeric("current_liabilities_previous", { precision: 20, scale: 4 }),
  totalLiabilitiesCurrent: numeric("total_liabilities_current", { precision: 20, scale: 4 }),
  totalLiabilitiesPrevious: numeric("total_liabilities_previous", { precision: 20, scale: 4 }),
  retainedEarningsCurrent: numeric("retained_earnings_current", { precision: 20, scale: 4 }),
  retainedEarningsPrevious: numeric("retained_earnings_previous", { precision: 20, scale: 4 }),
  stockholdersEquityCurrent: numeric("stockholders_equity_current", { precision: 20, scale: 4 }),
  stockholdersEquityPrevious: numeric("stockholders_equity_previous", { precision: 20, scale: 4 }),
  stockholdersEquityParentCurrent: numeric("stockholders_equity_parent_current", { precision: 20, scale: 4 }),
  stockholdersEquityParentPrevious: numeric("stockholders_equity_parent_previous", { precision: 20, scale: 4 }),
  bookValuePerShareCurrent: numeric("book_value_per_share_current", { precision: 20, scale: 4 }),
  bookValuePerSharePrevious: numeric("book_value_per_share_previous", { precision: 20, scale: 4 }),

  grossRevenueCurrent: numeric("gross_revenue_current", { precision: 20, scale: 4 }),
  grossRevenuePrevious: numeric("gross_revenue_previous", { precision: 20, scale: 4 }),
  grossExpenseCurrent: numeric("gross_expense_current", { precision: 20, scale: 4 }),
  grossExpensePrevious: numeric("gross_expense_previous", { precision: 20, scale: 4 }),
  incomeBeforeTaxCurrent: numeric("income_before_tax_current", { precision: 20, scale: 4 }),
  incomeBeforeTaxPrevious: numeric("income_before_tax_previous", { precision: 20, scale: 4 }),
  netIncomeAfterTaxCurrent: numeric("net_income_after_tax_current", { precision: 20, scale: 4 }),
  netIncomeAfterTaxPrevious: numeric("net_income_after_tax_previous", { precision: 20, scale: 4 }),
  netIncomeAttributableToParentCurrent: numeric("net_income_attributable_to_parent_current", {
    precision: 20,
    scale: 4,
  }),
  netIncomeAttributableToParentPrevious: numeric("net_income_attributable_to_parent_previous", {
    precision: 20,
    scale: 4,
  }),
  earningsPerShareBasicCurrent: numeric("eps_basic_current", { precision: 20, scale: 4 }),
  earningsPerShareBasicPrevious: numeric("eps_basic_previous", { precision: 20, scale: 4 }),
  earningsPerShareDilutedCurrent: numeric("eps_diluted_current", { precision: 20, scale: 4 }),
  earningsPerShareDilutedPrevious: numeric("eps_diluted_previous", { precision: 20, scale: 4 }),
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
