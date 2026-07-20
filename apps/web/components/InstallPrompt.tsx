"use client";

import { useEffect, useState } from "react";

/**
 * The manifest (app/manifest.ts) already makes PSEye installable, but Chromium
 * only surfaces its own install affordance behind a menu most people never
 * open. Catching `beforeinstallprompt` lets us offer an inline "Install" nudge
 * at the moment of interest — an installed home-screen icon is the strongest
 * no-account return lever we have. Android Chrome/Edge fire this event (iOS
 * Safari doesn't, so nothing shows there — acceptable, Android dominates PH).
 * Dismissal is remembered so the nudge never nags a second time.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pseye:install-dismissed";

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.localStorage.getItem(DISMISS_KEY)) return;
    // Already installed / running standalone — nothing to offer.
    if (window.matchMedia("(display-mode: standalone)").matches) return;

    function onBeforeInstall(e: Event) {
      e.preventDefault(); // keep Chrome's own mini-infobar from showing too
      setDeferred(e as BeforeInstallPromptEvent);
    }
    function onInstalled() {
      setDeferred(null);
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (!deferred) return null;

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice; // "accepted" fires appinstalled; either way we're done
    setDeferred(null);
  }

  function dismiss() {
    window.localStorage.setItem(DISMISS_KEY, "1");
    setDeferred(null);
  }

  return (
    <div className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-sm items-center gap-3 rounded-xl border border-white/10 bg-neutral-900 px-4 py-3 text-white shadow-2xl sm:left-auto sm:right-4 sm:mx-0">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">Install PSEye</p>
        <p className="mt-0.5 text-xs text-white/60">Add it to your home screen for one-tap market checks.</p>
      </div>
      <button
        type="button"
        onClick={install}
        className="shrink-0 rounded-md bg-[#30cc5a] px-3 py-1.5 text-xs font-semibold text-black transition-opacity hover:opacity-90"
      >
        Install
      </button>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss install prompt"
        className="shrink-0 rounded-md p-1 text-white/50 transition-colors hover:text-white"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
