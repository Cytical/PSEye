CREATE TABLE IF NOT EXISTS "market_snapshot" (
	"id" serial PRIMARY KEY NOT NULL,
	"snapshot_date" date NOT NULL,
	"psei_value" numeric(12, 4) NOT NULL,
	"psei_change" numeric(12, 4) NOT NULL,
	"psei_pct_change" numeric(8, 4) NOT NULL,
	"usd_php_rate" numeric(10, 4) NOT NULL,
	"captured_at" timestamp with time zone NOT NULL,
	CONSTRAINT "market_snapshot_snapshot_date_unique" UNIQUE("snapshot_date")
);
