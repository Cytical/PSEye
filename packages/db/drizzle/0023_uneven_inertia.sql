CREATE TABLE IF NOT EXISTS "nasdaq_quotes" (
	"ticker" varchar(16) PRIMARY KEY NOT NULL,
	"price" numeric(12, 4) NOT NULL,
	"pct_change" numeric(8, 4) NOT NULL,
	"market_cap" numeric(20, 2) NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL
);
