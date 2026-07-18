"use client";

import { useState } from "react";

/**
 * Uses the Web Share API on mobile/supporting browsers, falling back to a
 * clipboard copy with a brief confirmation everywhere else (desktop Chrome/
 * Firefox don't implement navigator.share).
 */
export function ShareButton({ title = "PSEye — PSE Market Map" }: { title?: string }) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
      } catch {
        // User dismissed the native share sheet — not an error.
      }
      return;
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={handleShare}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-black/10 px-3 py-1.5 text-xs font-medium text-black/70 transition-colors hover:bg-black/5 dark:border-white/15 dark:text-white/70 dark:hover:bg-white/10"
    >
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="18" cy="5" r="3" />
        <circle cx="6" cy="12" r="3" />
        <circle cx="18" cy="19" r="3" />
        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
      </svg>
      {copied ? "Copied!" : "Share"}
    </button>
  );
}
