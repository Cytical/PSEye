CREATE TABLE IF NOT EXISTS "company_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"ticker" varchar(16) NOT NULL,
	"description" text NOT NULL,
	"source" varchar(128) NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL,
	CONSTRAINT "company_profiles_ticker_unique" UNIQUE("ticker")
);
