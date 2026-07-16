CREATE TABLE IF NOT EXISTS "block_sales" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticker" varchar(16) NOT NULL,
	"company_name" text NOT NULL,
	"trade_date" date NOT NULL,
	"volume" bigint NOT NULL,
	"price" numeric(12, 4) NOT NULL,
	"value" bigint NOT NULL,
	CONSTRAINT "block_sales_ticker_trade_date_volume_price_unique" UNIQUE("ticker","trade_date","volume","price")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "corporate_actions" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticker" varchar(16) NOT NULL,
	"company_name" text NOT NULL,
	"type" varchar(32) NOT NULL,
	"ex_date" date NOT NULL,
	"record_date" date NOT NULL,
	"payment_date" date,
	"details" text NOT NULL,
	CONSTRAINT "corporate_actions_ticker_type_ex_date_unique" UNIQUE("ticker","type","ex_date")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "daily_quotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticker" varchar(16) NOT NULL,
	"company_name" text NOT NULL,
	"trade_date" date NOT NULL,
	"price" numeric(12, 4),
	"pct_change" numeric(8, 4),
	"market_cap" bigint,
	"sector" varchar(64) NOT NULL,
	CONSTRAINT "daily_quotes_ticker_trade_date_unique" UNIQUE("ticker","trade_date")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "disclosures" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticker" varchar(16) NOT NULL,
	"company_name" text NOT NULL,
	"type" varchar(32) NOT NULL,
	"headline" text NOT NULL,
	"filed_at" timestamp with time zone NOT NULL,
	"reference_no" varchar(64) NOT NULL,
	CONSTRAINT "disclosures_reference_no_unique" UNIQUE("reference_no")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "index_foreign_flow" (
	"id" serial PRIMARY KEY NOT NULL,
	"period_end" date NOT NULL,
	"foreign_buy_value" bigint NOT NULL,
	"foreign_sell_value" bigint NOT NULL,
	"net_value" bigint NOT NULL,
	CONSTRAINT "index_foreign_flow_period_end_unique" UNIQUE("period_end")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "news_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" varchar(64) NOT NULL,
	"title" text NOT NULL,
	"snippet" text,
	"url" text NOT NULL,
	"published_at" timestamp with time zone NOT NULL,
	"tickers" text[] DEFAULT '{}' NOT NULL,
	CONSTRAINT "news_items_url_unique" UNIQUE("url")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "offerings" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticker" varchar(16),
	"company_name" text NOT NULL,
	"sector" varchar(64) NOT NULL,
	"type" varchar(32) NOT NULL,
	"offer_price" numeric(12, 4) NOT NULL,
	"subscription_start" date NOT NULL,
	"subscription_end" date NOT NULL,
	"listing_date" date,
	"summary" text NOT NULL,
	CONSTRAINT "offerings_company_name_type_subscription_start_unique" UNIQUE("company_name","type","subscription_start")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "stock_foreign_flow" (
	"id" serial PRIMARY KEY NOT NULL,
	"period_end" date NOT NULL,
	"ticker" varchar(16) NOT NULL,
	"company_name" text NOT NULL,
	"net_value" bigint NOT NULL,
	"rank" integer NOT NULL,
	CONSTRAINT "stock_foreign_flow_period_end_ticker_unique" UNIQUE("period_end","ticker")
);
