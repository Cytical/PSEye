import "../lib/loadEnv";
import { sql } from "drizzle-orm";
import { createDb, newsItems } from "@pseye/db";
import { NEWS_SOURCES } from "@pseye/source-news";

/** Runs hourly (see .github/workflows/news-hourly.yml). Duplicate URLs are skipped. */
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const db = createDb(databaseUrl);

  const results = await Promise.allSettled(
    NEWS_SOURCES.map((source) => source.fetchLatest())
  );

  results.forEach((result, i) => {
    if (result.status === "rejected") {
      console.error(`Failed to fetch ${NEWS_SOURCES[i].name}:`, result.reason);
    }
  });

  const items = results.flatMap((result) =>
    result.status === "fulfilled" ? result.value : []
  );

  if (items.length === 0) {
    console.log("No news items fetched.");
    return;
  }

  const rows = items.map((item) => ({
    source: item.source,
    title: item.title,
    snippet: item.snippet,
    imageUrl: item.imageUrl,
    url: item.url,
    publishedAt: item.publishedAt,
    tickers: item.tickers,
  }));

  // onConflictDoUpdate (not onConflictDoNothing) so an already-seen article
  // gets its columns refreshed — in particular `image_url`, added in
  // migration 0005 after this job had already been inserting rows for a
  // while; onConflictDoNothing would leave every pre-existing row's
  // image_url permanently null since the job only sees the same URL again
  // while it's still within an outlet's RSS feed window (same bug pattern
  // fixed for disclosures'/offerings' `url` column — see those jobs).
  await db
    .insert(newsItems)
    .values(rows)
    .onConflictDoUpdate({
      target: newsItems.url,
      set: {
        source: sql`excluded.source`,
        title: sql`excluded.title`,
        snippet: sql`excluded.snippet`,
        imageUrl: sql`excluded.image_url`,
        publishedAt: sql`excluded.published_at`,
        tickers: sql`excluded.tickers`,
      },
    });

  console.log(`Upserted up to ${rows.length} news items.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
