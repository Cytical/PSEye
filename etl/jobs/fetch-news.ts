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
    url: item.url,
    publishedAt: item.publishedAt,
    tickers: item.tickers,
  }));

  await db.insert(newsItems).values(rows).onConflictDoNothing({ target: newsItems.url });

  console.log(`Inserted up to ${rows.length} news items (duplicates skipped).`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
