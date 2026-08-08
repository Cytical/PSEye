import { createDb, getBotPostByDate } from "@pseye/db";

/** The @PSEyeDaily handle the bot posts under. */
const BOT_HANDLE = "PSEyeDaily";

export interface BotPostLink {
  /** Permalink to the day's market-map tweet. */
  url: string;
  handle: string;
}

/**
 * The X/Twitter post for one trading day, if the bot made one.
 *
 * bot_posts has been written by post-daily-tweet.ts since the bot shipped and
 * read by nothing but that job's own idempotency guard: the site linked to the
 * account but never to the individual post it published about the very day a
 * visitor is looking at.
 *
 * Returns null for every day the bot did not post, which is currently most of
 * them: the scheduled workflow is disabled and the X API is blocked on
 * billing, so rows only exist for days posted manually through the /post-to-x
 * skill. That is the normal case, not an error, so this renders nothing rather
 * than an "unavailable" note.
 *
 * Same never-throw contract as every other lib/* reader here: any DB problem
 * degrades to no link.
 */
export async function getBotPostForDate(date: string): Promise<BotPostLink | null> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return null;

  try {
    const db = createDb(databaseUrl);
    const row = await getBotPostByDate(db, date);
    if (!row?.tweetId) return null;
    return { url: `https://x.com/${BOT_HANDLE}/status/${row.tweetId}`, handle: BOT_HANDLE };
  } catch (err) {
    console.error("getBotPostForDate: DB read failed, omitting the post link", err);
    return null;
  }
}
