"use client";

import { useState } from "react";

function outletInitials(source: string): string {
  const initials = source
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  return initials.slice(0, 3) || "PH";
}

/**
 * The share card's news image, majority-of-the-card by design (see
 * DailyRecapShareCard.tsx) — falls back to an outlet-initials tile on a
 * missing `imageUrl` or a load failure (a moved/removed externally-hosted
 * image), same fallback shape as NewsThumbnail.tsx's, just without that
 * component's logo-vs-photo `object-contain`/`object-cover` distinction —
 * this card doesn't carry `imageIsLogo`, and at this size a stretched logo
 * reads fine either way.
 */
export function MiniNewsThumb({ imageUrl, source }: { imageUrl: string | null; source: string }) {
  const [failed, setFailed] = useState(false);

  if (!imageUrl || failed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-panel-active" aria-hidden>
        <span className="text-lg font-bold tracking-tight text-panel-fg/50">{outletInitials(source)}</span>
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
    />
  );
}
