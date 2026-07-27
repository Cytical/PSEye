CREATE TABLE IF NOT EXISTS "bot_posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"post_date" date NOT NULL,
	"tweet_id" varchar(32) NOT NULL,
	"reply_tweet_id" varchar(32),
	"posted_at" timestamp with time zone NOT NULL,
	CONSTRAINT "bot_posts_post_date_unique" UNIQUE("post_date")
);
