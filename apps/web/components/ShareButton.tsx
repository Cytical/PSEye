"use client";

import { useEffect, useRef, useState } from "react";

/**
 * On touch devices, opens the native share sheet (navigator.share) so a link
 * can go straight into Messenger/Viber/Facebook — how sharing actually spreads
 * in the PH — carrying a title/text hook, not a bare URL. On desktop (fine
 * pointer, where the share sheet is clumsy or absent) it copies to the
 * clipboard instead, since "grab me a link fast" is the desktop expectation.
 * The clipboard path confirms with a floating toast rather than only swapping
 * the button label, since the button can be scrolled out of view (e.g. the
 * watchlist share button) before someone would notice a label change.
 */
export function ShareButton({
  getShareUrl,
  shareTitle,
  shareText,
}: {
  /** Defaults to the current page URL. Pass this to share a different URL than
   * the one currently in the address bar — e.g. the watchlist share link,
   * which encodes state (?tickers=) that isn't kept synced to the address bar. */
  getShareUrl?: () => string;
  /** Native-share sheet title (ignored on the clipboard/desktop path). */
  shareTitle?: string;
  /** Native-share sheet body hook, e.g. "BDO ₱126.80 (+1.2%) today". */
  shareText?: string;
}) {
  const [showToast, setShowToast] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  }, []);

  async function handleShare() {
    const url = getShareUrl ? getShareUrl() : window.location.href;

    // Native sheet only on touch devices: desktop Chrome exposes navigator.share
    // too, but there the fast clipboard copy is the better fit.
    const canNativeShare =
      typeof navigator !== "undefined" &&
      typeof navigator.share === "function" &&
      (navigator.maxTouchPoints ?? 0) > 0;

    if (canNativeShare) {
      try {
        await navigator.share({ title: shareTitle, text: shareText, url });
        return;
      } catch (err) {
        // User dismissed the sheet — not an error, and not a reason to then
        // silently copy. Only fall through to clipboard on a real failure.
        if (err instanceof DOMException && err.name === "AbortError") return;
      }
    }

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
