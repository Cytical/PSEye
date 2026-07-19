"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Always copies straight to the clipboard rather than opening the native
 * share sheet (navigator.share) — a picker adds a tap and a delay when the
 * whole point is "grab me a link fast". Confirms with a floating toast
 * instead of only swapping the button's own label, since the button can be
 * scrolled out of view (e.g. the watchlist's share button) before someone
 * would notice a label change.
 */
export function ShareButton({
  getShareUrl,
}: {
  /** Defaults to the current page URL. Pass this to share a different URL than
   * the one currently in the address bar — e.g. the watchlist share link,
   * which encodes state (?tickers=) that isn't kept synced to the address bar. */
  getShareUrl?: () => string;
}) {
  const [showToast, setShowToast] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  async function handleShare() {
    const url = getShareUrl ? getShareUrl() : window.location.href;
    await navigator.clipboard.writeText(url);
    setShowToast(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setShowToast(false), 1800);
  }

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onClick={handleShare}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-foreground/10 px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-foreground/5 dark:border-foreground/15 dark:hover:bg-foreground/10"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="18" cy="5" r="3" />
          <circle cx="6" cy="12" r="3" />
          <circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
          <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        Share
      </button>
      {showToast && (
        <span
          role="status"
          aria-live="polite"
          className="pointer-events-none absolute -top-9 left-1/2 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2.5 py-1 text-[11px] font-medium text-background shadow-lg"
        >
          Link copied!
        </span>
      )}
    </span>
  );
}
