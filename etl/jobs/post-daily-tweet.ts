import "../lib/loadEnv";
import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { chromium } from "playwright";
import { EUploadMimeType, TwitterApi } from "twitter-api-v2";
import {
  botPosts,
  createDb,
  getBotPostByDate,
  getDailyQuotesByDate,
  getMarketSnapshotByDate,
  getStockForeignFlowByDate,
} from "@pseye/db";
import { buildMapAltText, buildMapTweetText, buildRecapReplyText } from "../lib/tweetCopy";
import { triggerRevalidate } from "../lib/triggerRevalidate";

const CAPTURE_SELECTOR = "#market-map-canvas";

/**
 * Runs once/day after PSE's close, as .github/workflows/post-daily-tweet.yml's
 * cron (see that file for the exact timing rationale). Posts a screenshot of
 * the live market map to X, then replies to that same tweet with a text recap
 * and a link to the day's /daily/[date] page — the site's first social
 * presence. Data (PSEi snapshot, breadth, top movers, foreign flow) is read
 * directly via @pseye/db rather than importing apps/web/lib/dailyRecap.ts —
 * etl jobs are self-contained and never import from apps/web, same as every
 * other job here.
 *
 * `DRY_RUN=1` composes both tweets and saves the screenshot to
 * etl/dry-run-market-map.png instead of calling the X API — lets the whole
 * pipeline (DB reads, screenshot, tweet copy) be exercised and reviewed
 * without X credentials.
 */
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const dryRun = process.env.DRY_RUN === "1" || process.env.DRY_RUN === "true";
  // "||" not "??": an unset SITE_URL secret in GitHub Actions comes through
  // as an empty string, not undefined/null, so "??" wouldn't fall back here.
  const siteUrl = (process.env.SITE_URL || "https://pseye.site").replace(/\/$/, "");

  if (!dryRun) {
    for (const key of ["TWITTER_API_KEY", "TWITTER_API_SECRET", "TWITTER_ACCESS_TOKEN", "TWITTER_ACCESS_TOKEN_SECRET"]) {
      if (!process.env[key]) throw new Error(`${key} is required (or set DRY_RUN=1 to skip posting)`);
    }
  }

  const db = createDb(databaseUrl);
  const today = manilaToday();
  // DATE lets a dry run recap a prior trading day (e.g. the current day's
  // ETL hasn't landed yet) — restricted to dry runs since the real posting
  // path's bot_posts idempotency key must stay tied to the actual calendar
  // day, not the trading day being recapped. See the post-to-x skill.
  if (process.env.DATE && !dryRun) {
    throw new Error("DATE override is only supported with DRY_RUN=1");
  }
  const tradingDate = dryRun && process.env.DATE ? process.env.DATE : today;

  const alreadyPosted = await getBotPostByDate(db, today);
  if (alreadyPosted) {
    console.log(`post-daily-tweet: already posted for ${today} (tweet ${alreadyPosted.tweetId}) — skipping.`);
    return;
  }

  const [snapshotRow, quoteRows, flowRows] = await Promise.all([
    getMarketSnapshotByDate(db, tradingDate),
    getDailyQuotesByDate(db, tradingDate),
    getStockForeignFlowByDate(db, tradingDate),
  ]);

  // No snapshot AND no quotes recorded for the trading date — a
  // holiday/weekend workflow_dispatch, or the hourly ETL job hasn't landed
  // yet. Same soft-skip shape as fetch-market-snapshot.ts's blank-widget
  // case: log and exit green rather than fail, since this isn't an error.
  if (!snapshotRow && quoteRows.length === 0) {
    console.warn(`post-daily-tweet: no market data recorded for ${tradingDate} yet — skipping this run.`);
    return;
  }

  const traded = quoteRows
    .filter((r) => r.price != null && r.pctChange != null)
    .map((r) => ({ ticker: r.ticker, pctChange: Number(r.pctChange) }));
  const byPctDesc = [...traded].sort((a, b) => b.pctChange - a.pctChange);

  const breadth =
    quoteRows.length > 0
      ? {
          advancers: traded.filter((r) => r.pctChange > 0).length,
          decliners: traded.filter((r) => r.pctChange < 0).length,
          unchanged: traded.filter((r) => r.pctChange === 0).length,
        }
      : null;

  const topGainer = byPctDesc[0] && byPctDesc[0].pctChange > 0 ? byPctDesc[0] : null;
  const lastNegative = [...byPctDesc].reverse()[0];
  const topLoser = lastNegative && lastNegative.pctChange < 0 ? lastNegative : null;

  const buys = flowRows.filter((r) => r.netValue > 0).sort((a, b) => b.netValue - a.netValue);
  const sells = flowRows.filter((r) => r.netValue < 0).sort((a, b) => a.netValue - b.netValue);
  const topForeignBuy = buys[0] ? { ticker: buys[0].ticker, netValue: buys[0].netValue } : null;
  const topForeignSell = sells[0] ? { ticker: sells[0].ticker, netValue: sells[0].netValue } : null;

  const snapshot = snapshotRow
    ? {
        pseiValue: Number(snapshotRow.pseiValue),
        pseiChange: Number(snapshotRow.pseiChange),
        pseiPctChange: Number(snapshotRow.pseiPctChange),
      }
    : null;

  await triggerRevalidate(["daily-quotes", "company-profiles"], ["/", `/daily/${tradingDate}`]);

  const dateLabel = formatDateLabel(tradingDate);
  const mapText = buildMapTweetText({ dateLabel, siteUrl, snapshot, breadth });
  const recapText = buildRecapReplyText({ date: tradingDate, siteUrl, topGainer, topLoser, topForeignBuy, topForeignSell });
  const altText = buildMapAltText(dateLabel);

  console.log("post-daily-tweet: tweet 1 (map) —\n" + mapText);
  console.log("post-daily-tweet: tweet 2 (reply) —\n" + recapText);

  const screenshot = await captureMarketMapScreenshot(siteUrl);

  if (dryRun) {
    const outPath = join(process.cwd(), "dry-run-market-map.png");
    await writeFile(outPath, new Uint8Array(screenshot));
    console.log(`post-daily-tweet: DRY_RUN set — saved screenshot to ${outPath}, did not post to X.`);
    return;
  }

  const client = new TwitterApi({
    appKey: process.env.TWITTER_API_KEY!,
    appSecret: process.env.TWITTER_API_SECRET!,
    accessToken: process.env.TWITTER_ACCESS_TOKEN!,
    accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
  });

  const mediaId = await client.v1.uploadMedia(screenshot, { mimeType: EUploadMimeType.Png });
  await client.v1.createMediaMetadata(mediaId, { alt_text: { text: altText } });

  const { data: tweet } = await client.v2.tweet({ text: mapText, media: { media_ids: [mediaId] } });
  const { data: reply } = await client.v2.tweet({ text: recapText, reply: { in_reply_to_tweet_id: tweet.id } });

  await db.insert(botPosts).values({
    postDate: today,
    tweetId: tweet.id,
    replyTweetId: reply.id,
    postedAt: new Date(),
  });

  console.log(
    `post-daily-tweet: posted https://x.com/i/web/status/${tweet.id} with reply https://x.com/i/web/status/${reply.id}`
  );
}

/** PSE trades on Manila time — "today" for the bot is the Manila calendar day. */
function manilaToday(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Manila" });
}

function formatDateLabel(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Screenshots the live market map's #market-map-canvas element (see components/MarketMap.tsx) — just the treemap, not the filter sidebar/PSEi summary/top movers — at 2x scale for a crisp X image. */
async function captureMarketMapScreenshot(siteUrl: string): Promise<Buffer> {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1040 }, deviceScaleFactor: 2 });
    const page = await context.newPage();
    await page.goto(`${siteUrl}/`, { waitUntil: "networkidle", timeout: 60_000 });

    const capture = page.locator(CAPTURE_SELECTOR);
    await capture.waitFor({ state: "visible", timeout: 30_000 });
    // The treemap measures its own width via ResizeObserver on mount before
    // laying out tiles — wait for at least one rendered tile rather than a
    // fixed delay, so this doesn't flake on a slow cold render. Tiles are
    // absolutely-positioned <button title="TICKER ...">, not SVG (2026-08-05:
    // the old `svg rect` selector never actually matched a tile — it
    // happened to resolve against the calendar-icon SVG in the filter
    // sidebar's date picker, which was still in scope back when
    // CAPTURE_SELECTOR was #market-map-capture; now that it's scoped to just
    // #market-map-canvas, that icon is out of scope too, so this needs a
    // selector that actually matches a tile).
    await page.waitForSelector(`${CAPTURE_SELECTOR} button[title]`, { timeout: 30_000 });
    await page.waitForTimeout(500);

    // A manually-measured clip, not locator.screenshot() — confirmed live
    // that locator.screenshot()'s own scroll-into-view step interacts badly
    // with the sticky header/ticker tape above this element, clipping into
    // the top of the captured content. page.screenshot({ clip }) with a
    // freshly measured box doesn't have that problem.
    const box = await capture.boundingBox();
    if (!box) throw new Error(`post-daily-tweet: ${CAPTURE_SELECTOR} has no bounding box`);
    return (await page.screenshot({ type: "png", clip: box })) as Buffer;
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
