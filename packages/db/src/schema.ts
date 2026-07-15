import {
  pgTable,
  serial,
  text,
  date,
  timestamp,
  numeric,
  bigint,
  varchar,
  unique,
} from "drizzle-orm/pg-core";

export const dailyQuotes = pgTable(
  "daily_quotes",
  {
    id: serial("id").primaryKey(),
    ticker: varchar("ticker", { length: 16 }).notNull(),
    tradeDate: date("trade_date").notNull(),
    price: numeric("price", { precision: 12, scale: 4 }).notNull(),
    pctChange: numeric("pct_change", { precision: 8, scale: 4 }).notNull(),
    marketCap: bigint("market_cap", { mode: "number" }),
    sector: varchar("sector", { length: 64 }).notNull(),
  },
  (table) => [unique().on(table.ticker, table.tradeDate)]
);

export const newsItems = pgTable("news_items", {
  id: serial("id").primaryKey(),
  source: varchar("source", { length: 64 }).notNull(),
  title: text("title").notNull(),
  snippet: text("snippet"),
  url: text("url").notNull().unique(),
  publishedAt: timestamp("published_at", { withTimezone: true }).notNull(),
  tickers: text("tickers").array().notNull().default([]),
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
