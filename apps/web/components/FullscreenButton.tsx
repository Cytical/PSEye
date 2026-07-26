"use client";

import { useEffect, useState, type RefObject } from "react";

/**
 * Matches finviz's own map toolbar, which has a "Fullscreen" icon next to
 * "Share Map" (confirmed live) — lets a visitor expand the map to the full
 * browser viewport via the standard Fullscreen API, rather than just the
 * browser's own zoom. `targetRef` is deliberately just the canvas, not the
 * filter sidebar (see MarketMap.tsx), so fullscreen gives the map the whole
 * screen instead of spending width on the sidebar. Tracks `fullscreenElement`
 * via the `fullscreenchange` event (not local state alone) since fullscreen
 * can also be exited by the browser itself (Esc key), which wouldn't fire
 * this component's own click handler.
 */
export function FullscreenButton({ targetRef }: { targetRef: RefObject<HTMLElement | null> }) {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(document.fullscreenElement === targetRef.current);
    }
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, [targetRef]);

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        return;
      }
      await targetRef.current?.requestFullscreen();
    } catch {
      // Some browsers/embeds reject requestFullscreen (Permissions-Policy,
      // user setting, etc.) — fullscreenchange simply never fires in that
      // case, so isFullscreen stays false; nothing else to reconcile.
    }
  }

  return (
    <button
      type="button"
      onClick={toggleFullscreen}
      aria-pressed={isFullscreen}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-foreground/10 px-3 py-1.5 text-xs font-medium text-foreground/70 transition-colors hover:bg-foreground/5 dark:border-foreground/15 dark:hover:bg-foreground/10"
    >
      {isFullscreen ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3v3a2 2 0 0 1-2 2H3" />
          <path d="M21 8h-3a2 2 0 0 1-2-2V3" />
          <path d="M3 16h3a2 2 0 0 1 2 2v3" />
          <path d="M16 21v-3a2 2 0 0 1 2-2h3" />
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8 3H5a2 2 0 0 0-2 2v3" />
          <path d="M16 3h3a2 2 0 0 1 2 2v3" />
          <path d="M21 16v3a2 2 0 0 1-2 2h-3" />
          <path d="M3 16v3a2 2 0 0 0 2 2h3" />
        </svg>
      )}
      {isFullscreen ? "Exit fullscreen" : "Fullscreen"}
    </button>
  );
}
