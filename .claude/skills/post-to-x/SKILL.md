---
name: post-to-x
description: "Manually posts today's PSEye market-map tweet + recap reply to @PSEyeDaily by driving Claude in Chrome, bypassing the X API entirely. Use this ONLY while the API path is blocked (currently: 402 credits-depleted on the X Developer Portal project — see etl/jobs/post-daily-tweet.ts). Once billing is resolved, prefer the real automated job (post-daily-tweet.yml) and skip this skill."
argument-hint: ""
metadata:
  author: pseye
  version: "1.0.0"
---

# Post to X (manual browser fallback)

Posts today's market-map tweet + recap reply to `@PSEyeDaily` by literally driving the browser (Claude in Chrome) the way a human would, instead of calling the X API via `twitter-api-v2`. This exists because the X Developer Portal project's Pay-Per-Use credits are depleted (`ApiResponseError code 402, type: credits-depleted` — confirmed live, see `etl/jobs/post-daily-tweet.ts`'s `client.v2.tweet()` call). It costs nothing and needs no API credentials.

**Before running this**: check whether today's post already exists — either ask the user, or check the `bot_posts` table / `@PSEyeDaily`'s profile for a post from today. Don't double-post.

**Once X billing is resolved**, this skill is unnecessary — the real cron (`post-daily-tweet.yml`, `35 8 * * 1-5`) handles it automatically. Don't reach for this skill out of habit once the API path works again.

## Step 1 — Generate today's real tweet copy + screenshot

From `etl/`, run the job in dry-run mode (uses real DB data, no X API call, no credentials needed):

```bash
cd etl && DRY_RUN=1 npx tsx jobs/post-daily-tweet.ts
```

This prints both tweet texts to stdout (tweet 1 = market map, tweet 2 = recap reply) and saves the screenshot to `etl/dry-run-market-map.png`. Never hand-write the numbers — always read them from this output, it's pulling real data from `@pseye/db`.

If the job warns `no market data recorded for <date> yet`, the day's ETL hasn't landed — stop and tell the user, don't fabricate a post.

## Step 2 — Stage the screenshot where the browser tool can read it

Claude in Chrome's `file_upload` tool only accepts files already shared with the session (attachments, the session's own scratchpad/outputs folder, or connected folders) — a raw repo path like `etl/dry-run-market-map.png` will be rejected. Copy it into **this session's scratchpad directory** (the absolute path given in your system prompt under "Scratchpad Directory" — it's session-specific, don't hardcode a path from a previous session):

```bash
cp "etl/dry-run-market-map.png" "<this-session's-scratchpad-dir>/pseye-market-map.png"
```

## Step 3 — Load Chrome tools and get to the compose box

If the `mcp__claude-in-chrome__*` tools are deferred, load them in one `ToolSearch` call: `select:mcp__claude-in-chrome__tabs_context_mcp,mcp__claude-in-chrome__navigate,mcp__claude-in-chrome__computer,mcp__claude-in-chrome__find,mcp__claude-in-chrome__file_upload,mcp__claude-in-chrome__get_page_text`.

1. `tabs_context_mcp` (createIfEmpty: true), then `tabs_create_mcp` for a fresh tab.
2. `navigate` to `https://x.com/home`. Screenshot to confirm the session is logged in as `@PSEyeDaily` (visible in the bottom-left account switcher) — if it's a different account, stop and ask the user.
3. **Use the inline "What's happening?" box at the top of the Home timeline — do NOT click the sidebar "Post" button.** The sidebar button opens a separate modal dialog that visually looks like the compose box but is a distinct DOM element; in practice the inline timeline box is the one that reliably keeps text and an uploaded image together. Click directly on the "What's happening?" placeholder text inside the timeline.

## Step 4 — Type tweet 1, then attach the image

Order matters less than verifying each step with a screenshot before moving on — X's SPA routing means a click that misses its target can navigate you away entirely (e.g. a stray keystroke landing outside the textbox can trigger a single-letter keyboard shortcut like `e` → Explore, silently discarding the draft). After every click, screenshot before typing.

1. Click the compose box, confirm focus via screenshot (the box should show a caret / "Everyone can reply" line, not just placeholder text), then `computer` type action with the exact tweet-1 text from Step 1's output (multi-line, emoji and all — the tool handles this fine).
2. Press `Escape` — typing `#PSEi` triggers a hashtag-autocomplete dropdown that can swallow the next click if left open.
3. `find` for "file input for adding photo/media to post" scoped to the inline box, then `file_upload` the staged PNG from Step 2 to that ref.
4. Screenshot to confirm both the text (with the `pseye.site` link auto-carded) and the image thumbnail are present in the same box before posting.

## Step 5 — Post it

Click the inline box's own "Post" button (not the sidebar one). After clicking, X may show an **"Unlock more on X" / `graduated-access` interstitial** ("To make X great for everyone, we want to be sure there's a human behind this account..."). **This is not a failure and not something to work around** — it's a low-engagement-account visibility nudge (limits search discoverability / DMs from strangers) that can appear alongside a successful post, not instead of one. Confirmed live: the post still went through underneath it. Do not attempt to "prove human-ness" by auto-liking/following through this modal — that would be evading X's own bot-detection, which is out of scope for this skill. Just close the modal (X button) and verify success independently:

- Look for a "Your post was sent" toast, or
- Navigate to `https://x.com/PSEyeDaily` and confirm a fresh post at the top with today's content.

Grab the new tweet's status URL/ID from the profile (click into the tweet — the URL becomes `x.com/PSEyeDaily/status/<id>`).

## Step 6 — Reply with tweet 2

On that tweet's page, click "Post your reply", type tweet 2's text from Step 1's output, `Escape` to dismiss the hashtag autocomplete, then click "Reply". Confirm the same way (toast, or refresh and check the thread).

## Step 7 — Record it so the real bot doesn't double-post

The automated job's idempotency check (`getBotPostByDate` in `etl/jobs/post-daily-tweet.ts`) reads the `bot_posts` table — a manual post via this skill never touches that table on its own, so if X billing gets fixed later *today*, the cron would post again. Insert the row yourself: write a short one-off script (same disposable-diagnostic pattern as this project's past debug scripts — create it, run it, delete it, never commit it) that does:

```ts
import "../lib/loadEnv";
import { createDb, botPosts } from "@pseye/db";

const db = createDb(process.env.DATABASE_URL!);
await db.insert(botPosts).values({
  postDate: "<YYYY-MM-DD, Manila date from Step 1's output>",
  tweetId: "<status id from Step 5>",
  replyTweetId: "<status id from Step 6>",
  postedAt: new Date(),
});
```

Run it from `etl/` with `npx tsx <scriptname>.ts`, confirm it inserted (no error), then delete the script.

## Step 8 — Report back

Tell the user: both tweet URLs, and confirm the `bot_posts` row was recorded (so they know the cron won't double-post). Don't claim success without having verified via profile/toast in Step 5 and 6 — a silently-lost draft (e.g. from the stray-keystroke-navigation issue in Step 4) looks identical to a slow page load until you check.
