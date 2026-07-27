CREATE TABLE IF NOT EXISTS "news_outlet_logos" (
	"source" varchar(64) PRIMARY KEY NOT NULL,
	"logo_url" text NOT NULL,
	"fetched_at" timestamp with time zone NOT NULL
);
