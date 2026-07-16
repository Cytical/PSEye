CREATE TABLE IF NOT EXISTS "historical_quotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticker" varchar(16) NOT NULL,
	"trade_date" date NOT NULL,
	"close" numeric(12, 4) NOT NULL,
	CONSTRAINT "historical_quotes_ticker_trade_date_unique" UNIQUE("ticker","trade_date")
);
