CREATE TABLE IF NOT EXISTS "daily_index_foreign_flow" (
	"id" serial PRIMARY KEY NOT NULL,
	"period_end" date NOT NULL,
	"net_value" bigint NOT NULL,
	CONSTRAINT "daily_index_foreign_flow_period_end_unique" UNIQUE("period_end")
);
