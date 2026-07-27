import "../lib/loadEnv";
import { sql } from "drizzle-orm";
import { createDb, newsItems, getNewsOutletLogos, upsertNewsOutletLogo } from "@pseye/db";
import { NEWS_SOURCES, fetchOgImage, fetchOutletLogo } from "@pseye/source-news";

/**
 * Runs once/day via .github/workflows/fetch-daily.yml (see that file's
 * comment — cron fires 2 hours early to compensate for GitHub's observed
 * scheduling delay). Used to have its own hourly workflow before the 2026-07
 * consolidation; that workflow no longer exists. Duplicate URLs are skipped.
 */
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

  // Second-choice image source: RSS extraction (extractImageUrl in
  // rssSource.ts) already tried enclosure/media:content/inline-<img>; any
  // item still left with imageUrl === null gets one extra fetch of its own
  // article page's og:image (or twitter:image) meta tag — the same tag
  // every social-link-unfurl already reads, so this is no more than a
  // normal browser/social-platform link preview would do. Bounded to
  // whatever's left over (today: ~Philstar Business's volume, since its feed
  // carries no image field at all — every other configured outlet's RSS
  // already supplies one), sequential with a short delay between requests —
  // same "one extra GET per item, don't hammer the source concurrently"
  // shape as backfill-company-profiles.ts's fetchOne/sleep(300) loop.
  // fetchOgImage never throws (see its own doc comment), so one article
  // page 404ing/timing out/lacking the tag can't fail the whole run — it
  // just leaves that item's imageUrl null, same as today, and NewsThumbnail
  // falls back to its outlet-initials placeholder card.
  let ogImagesFound = 0;
  for (const item of items) {
    if (item.imageUrl) continue;
    const ogImage = await fetchOgImage(item.url);
    if (ogImage) {
      item.imageUrl = ogImage;
      ogImagesFound++;
    }
    await sleep(300);
  }
  if (ogImagesFound > 0) {
    console.log(`Found ${ogImagesFound} og:image fallback(s) for articles with no RSS image.`);
  }

  // Third and last real-image fallback: whatever's still imageUrl === null
  // after RSS + per-article og:image gets that outlet's own logo instead of
  // going straight to NewsThumbnail's initials placeholder. Resolved (and,
  // on success, cached to news_outlet_logos) at most *once per outlet per
  // run* — outletLogoCache starts pre-populated from the DB (outlets already
  // resolved in a past run), and attemptedLogoSources additionally guards
  // against re-attempting a *failed* lookup for every one of that outlet's
  // articles in this same run (a failure isn't persisted, since it might be
  // a transient fetch issue rather than "this outlet truly has no logo" —
  // worth retrying on the next daily run, just not dozens of times in this one).
  const homepageUrlBySource = new Map(NEWS_SOURCES.map((source) => [source.name, source.homepageUrl]));
  const outletLogoCache = await getNewsOutletLogos(db);
  const attemptedLogoSources = new Set<string>();
  let logoFallbacksUsed = 0;

  for (const item of items) {
    if (item.imageUrl) continue;

    let logoUrl = outletLogoCache.get(item.source);
    if (logoUrl === undefined && !attemptedLogoSources.has(item.source)) {
      attemptedLogoSources.add(item.source);
      const found = await fetchOutletLogo(homepageUrlBySource.get(item.source));
      if (found) {
        outletLogoCache.set(item.source, found);
        await upsertNewsOutletLogo(db, item.source, found);
        logoUrl = found;
      }
      await sleep(300);
    }

    if (logoUrl) {
      item.imageUrl = logoUrl;
      logoFallbacksUsed++;
    }
  }
  if (logoFallbacksUsed > 0) {
    console.log(`Used an outlet-logo fallback image for ${logoFallbacksUsed} article(s).`);
  }

  const rows = items.map((item) => ({
    source: item.source,
    title: item.title,
    snippet: item.snippet,
    imageUrl: item.imageUrl,
    url: item.url,
    publishedAt: item.publishedAt,
    tickers: item.tickers,
    sentiment: item.sentiment,
  }));

  // onConflictDoUpdate (not onConflictDoNothing) so an already-seen article
  // gets its columns refreshed — in particular `image_url`, added in
  // migration 0005 after this job had already been inserting rows for a
  // while; onConflictDoNothing would leave every pre-existing row's
  // image_url permanently null since the job only sees the same URL again
  // while it's still within an outlet's RSS feed window (same bug pattern
  // fixed for disclosures'/offerings' `url` column — see those jobs). Same
  // reasoning applies to `sentiment` (migration 0013): a row inserted before
  // that column existed only gets scored once this job sees its URL again.
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
        sentiment: sql`excluded.sentiment`,
      },
    });

  console.log(`Upserted up to ${rows.length} news items.`);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
