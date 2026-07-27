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
      <span className="font-news-serif text-2xl font-bold tracking-tight text-[#990F3D]/45 dark:text-[#D75980]/55">
        {outletInitials(item.source)}
      </span>
    </div>
  );
}

/**
 * Renders the article's real image when the feed provided one (see
 * extractImageUrl in packages/sources/news/src/rssSource.ts — enclosure,
 * media:content, or an inline <img> pulled from the full-content HTML),
 * falling back to an outlet-mark placeholder card in two cases:
 *
 *  - imageUrl is null (that extraction found nothing — true for every
 *    Philstar Business article today, since its feed carries no image field
 *    at all, not even inline in the description).
 *  - imageUrl is set but 404s/fails to load at render time (an outlet's own
 *    hosted image having since moved or been removed — this app doesn't
 *    control that host). Without this, the bare <img> left a broken-image
 *    icon in place, which is the literal "images don't load" complaint this
 *    fixes; a client component (not the server-rendered NewsCard) only
 *    because onError needs to run in the browser.
 */
export function NewsThumbnail({ item, className }: { item: NewsItem; className: string }) {
  const [failed, setFailed] = useState(false);

  if (!item.imageUrl || failed) {
    return (
      <div className={`shrink-0 overflow-hidden ${className}`}>
        <Placeholder item={item} className="h-full w-full" />
      </div>
    );
  }

  return (
    <div className={`shrink-0 overflow-hidden bg-[#1A1210]/5 dark:bg-[#F2E9E2]/10 ${className}`}>
      {/* External, outlet-controlled hosts — next/image would need an
          unbounded remotePatterns allowlist for one <img>'s worth of value. */}
      <img
        src={item.imageUrl}
        alt=""
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
      />
    </div>
  );
}
