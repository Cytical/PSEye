"use client";

import { useState } from "react";

/**
 * A company's own logo — a pre-trimmed, self-contained `data:image/webp;
 * base64,...` URI (see the company_profiles.logoImage schema doc comment
 * and etl/jobs/backfill-company-profiles.ts's processLogo, which crops the
 * uniform-color padding a raw PSE Edge logo ships with before this ever
 * renders). Most of those logos are flat art designed for a white
 * background, so this always wraps them in a white chip regardless of the
 * site's own light/dark theme, rather than letting a dark-mark-on-white
 * logo vanish against the dark theme.
 *
 * The `<img>` also uses `mix-blend-mode: multiply` against that same white
 * chip: white pixels multiplied with a white background stay white, i.e.
 * they blend into the chip with no visible edge, while colored/dark pixels
 * multiply through darker and stay visible. Combined with the server-side
 * trim, this removes both the outer whitespace margin (server) and any
 * remaining near-white fill inside the trimmed frame (client) — together
 * they're what make this read as a real cutout rather than a boxed-in
 * thumbnail.
 *
 * Renders nothing (not a placeholder) when there's no logoImage or the
 * image fails to decode — same "omit rather than fake it" contract as the
 * rest of this page's optional fields, and a missing logo isn't worth a
 * monogram card the way a missing news thumbnail is. Client component only
 * because onError needs to run in the browser, same reason as NewsThumbnail.
 */
export function CompanyLogo({ logoImage, alt, size = 52 }: { logoImage: string | null; alt: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  if (!logoImage || failed) return null;

  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-md bg-white ring-1 ring-black/10"
      style={{ height: size, width: size }}
    >
      <img
        src={logoImage}
        alt={alt}
        loading="lazy"
        onError={() => setFailed(true)}
        className="h-full w-full object-contain p-0.5 mix-blend-multiply"
      />
    </span>
  );
}
