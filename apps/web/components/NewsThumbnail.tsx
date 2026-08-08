"use client";

import { useState } from "react";
import type { NewsItem } from "@pseye/source-news";

/**
 * First letters of each significant word in the outlet name, e.g.
 * "BusinessWorld" -> "B", "GMA News Money" -> "GNM" (capped to 3 chars) —
 * used as the placeholder card's mark. Falls back to "PH" (never expected in
 * practice; every configured outlet in outlets.ts has a non-empty name).
 */
function outletInitials(source: string): string {
  const initials = source
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  return initials.slice(0, 3) || "PH";
}

function Placeholder({ item, className }: { item: NewsItem; className: string }) {
  return (
    <div
      className={`flex items-center justify-center bg-[#990F3D]/10 dark:bg-[#D75980]/15 ${className}`}
      aria-hidden
    >
      {/* Solid brand color, not the /45 and /55 washes this started at: against
          its own 10%/15% tint those measured 2.30:1 and 1.90:1 — below even the
          3:1 large-text floor, so the outlet monogram (the only thing
          identifying the source when no image loaded) was barely visible.
          Solid reads 6.41:1 light / 4.35:1 dark and suits the mark better. */}
      <span className="font-news-serif text-2xl font-bold tracking-tight text-[#990F3D] dark:text-[#D75980]">
        {outletInitials(item.source)}
      </span>
    </div>
  );
}

/**
 * Renders the article's real image, tried in the same priority order
 * fetch-news.ts fetches/stores them in: RSS extraction (enclosure,
 * media:content, or an inline <img> — see extractImageUrl in
 * packages/sources/news/src/rssSource.ts), then a per-article og:image/
 * twitter:image scrape (ogImage.ts), then that outlet's own cached logo
 * (outletLogo.ts) — all three land in the same `imageUrl` field, so this
 * component doesn't need to know which one produced it except for fit
 * (see imageIsLogo below). Falls back to an outlet-initials placeholder
 * card only when every one of those came up empty, or when imageUrl 404s/
 * fails to load at render time (an outlet's own hosted image having since
 * moved or been removed — this app doesn't control that host). Without that
 * onError handling, the bare <img> left a broken-image icon in place, which
 * is the literal "images don't load" complaint this fixes; a client
 * component (not the server-rendered NewsCard) only because onError needs to
 * run in the browser.
 */
export function NewsThumbnail({
  item,
  className,
  priority = false,
}: {
  item: NewsItem;
  className: string;
  /**
   * Set on the images that are above the fold on first paint (the hero, and
   * the lead card of the first desk block). Everything below stays lazy.
   *
   * Without this every variant was `loading="lazy"`, including the hero, which
   * is the LCP element of /news: the first paint of the section front was a
   * blank rectangle where the lead story's photo goes, filled in only after
   * the lazy-load threshold was evaluated. Deferring the one image the page is
   * measured on is the opposite of what lazy loading is for.
   */
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (!item.imageUrl || failed) {
    return (
      <div className={`shrink-0 overflow-hidden ${className}`}>
        <Placeholder item={item} className="h-full w-full" />
      </div>
    );
  }

  // A logo-fallback image (item.imageIsLogo, set in apps/web/lib/news.ts by
  // comparing imageUrl against the outlet's cached logo) is usually a
  // square/wordmark brand mark, not a landscape photo — object-cover would
  // zoom in and crop it awkwardly, especially in HeroCard's wide aspect-video
  // slot, so it gets object-contain with some breathing room instead. Real
  // RSS/og:image photos keep the tighter object-cover crop, which suits them better.
  const imageClassName = item.imageIsLogo
    ? "h-full w-full object-contain p-4 transition duration-300 group-hover:scale-[1.03]"
    : "h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]";

  return (
    <div className={`shrink-0 overflow-hidden bg-[#1A1210]/5 dark:bg-[#F2E9E2]/10 ${className}`}>
      {/* External, outlet-controlled hosts — next/image would need an
          unbounded remotePatterns allowlist for one <img>'s worth of value. */}
      <img
        src={item.imageUrl}
        alt=""
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : undefined}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={imageClassName}
      />
    </div>
  );
}
