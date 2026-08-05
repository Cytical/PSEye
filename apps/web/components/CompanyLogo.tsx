"use client";

import { useState } from "react";

/**
 * A company's own logo, sourced from PSE Edge's company info page (see
 * parseCompanyInfoHtml's logoUrl field) — most PSE Edge logos are flat art
 * designed for a white background, so this always wraps them in a white
 * chip regardless of the site's own light/dark theme, rather than letting a
 * dark-text-on-transparent logo vanish against the dark theme.
 *
 * Renders nothing (not a placeholder) when there's no logoUrl or the image
 * 404s/fails to load — same "omit rather than fake it" contract as the rest
 * of this page's optional fields, and a missing logo isn't worth a monogram
 * card the way a missing news thumbnail is. Client component only because
 * onError needs to run in the browser, same reason as NewsThumbnail.
 */
export function CompanyLogo({ logoUrl, alt, size = 36 }: { logoUrl: string | null; alt: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (!logoUrl || failed) return null;

  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-white ring-1 ring-black/10"
      style={{ height: size, width: size }}
    >
      {/* External, PSE Edge-controlled host — next/image would need a
          remotePatterns entry for one image's worth of value, same call as
          NewsThumbnail's outlet images. */}
      <img
        src={logoUrl}
        alt={alt}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="h-full w-full object-contain p-1"
      />
    </span>
  );
}
