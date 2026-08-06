import "../lib/loadEnv";
import { sql } from "drizzle-orm";
import { createDb, newsItems } from "@pseye/db";
import { classifyTopic } from "@pseye/source-news";
import { triggerRevalidate } from "../lib/triggerRevalidate";
import { NEWS_REVALIDATE_PATHS } from "../lib/newsPaths";

/**
 * Recomputes `news_items.topic` for every stored row from its existing
 * title + snippet.
 *
 * Exists because the desk lexicon (classifyTopic in
 * packages/sources/news/src/topics.ts) is code that will be edited again,
 * while the column it writes is data that was computed once at fetch time.
 * Without this, improving the lexicon would only affect stories fetched
 * afterwards: a story is only re-fetched while it is still inside its
 * outlet's RSS feed window, so anything older than a day or two would keep
 * its old desk forever, and the page would show two different
 * classifications side by side.
 *
 * Manual/one-off, like the backfill-* jobs. Run it after any edit to
 * TOPIC_KEYWORDS or NEWS_TOPICS. Touches no network beyond the database, so
 * it takes seconds rather than the ~20 minutes a full fetch-news does.
 */
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const db = createDb(databaseUrl);
  const rows = await db
    .select({ id: newsItems.id, title: newsItems.title, snippet: newsItems.snippet, topic: newsItems.topic })
    .from(newsItems);

  if (rows.length === 0) {
    console.log("No news items to reclassify.");
    return;
  }

  // Grouped into one UPDATE per desk rather than one per row: at a few
  // thousand rows over a serverless Postgres connection, per-row round trips
  // dominate the runtime entirely.
  const idsByTopic = new Map<string, number[]>();
  let changed = 0;
  for (const row of rows) {
    const topic = classifyTopic(`${row.title} ${row.snippet ?? ""}`);
    if (topic === row.topic) continue;
    changed++;
    const bucket = idsByTopic.get(topic);
    if (bucket) bucket.push(row.id);
    else idsByTopic.set(topic, [row.id]);
  }

  if (changed === 0) {
    console.log(`All ${rows.length} news items already carry their current desk.`);
    return;
  }

  for (const [topic, ids] of idsByTopic) {
    await db
      .update(newsItems)
      .set({ topic })
      .where(sql`${newsItems.id} = ANY(${sql.raw(`ARRAY[${ids.join(",")}]`)})`);
    console.log(`  ${topic}: ${ids.length}`);
  }

  console.log(`Reclassified ${changed} of ${rows.length} news items.`);
  await triggerRevalidate(["news"], NEWS_REVALIDATE_PATHS);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
