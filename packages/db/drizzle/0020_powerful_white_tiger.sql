ALTER TABLE "news_items" ADD COLUMN "author" varchar(128);--> statement-breakpoint
ALTER TABLE "news_items" ADD COLUMN "topic" varchar(32);--> statement-breakpoint
ALTER TABLE "news_items" ADD COLUMN "word_count" integer;