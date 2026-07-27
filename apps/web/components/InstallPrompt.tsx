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
 *
 * "Moment of interest" is doing real work in that sentence: the banner waits
 * for engagement (see ENGAGE_MS) and steps aside over the footer, rather than
 * appearing on first paint and sitting on top of the legal disclaimer.
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pseye:install-dismissed";

/**
 * How long a visitor has to stick around before we ask. `beforeinstallprompt`
 * fires as soon as Chrome's own heuristics are satisfied, which in practice is
 * within a second of first paint — so the banner used to greet people who had
 * not yet seen a single price. Asking someone to install an app they haven't
 * evaluated is the weakest possible moment to ask, and a dismissal is
 * remembered forever, so a badly-timed prompt doesn't just fail, it burns the
 * only chance. Scrolling past the fold counts as engagement too, whichever
 * comes first.
 */
const ENGAGE_MS = 25_000;

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [engaged, setEngaged] = useState(false);
  /** Suppressed while the footer is on screen — see the IntersectionObserver below. */
  const [footerVisible, setFooterVisible] = useState(false);

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

  useEffect(() => {
    const timer = window.setTimeout(() => setEngaged(true), ENGAGE_MS);
    function onScroll() {
      if (window.scrollY > window.innerHeight * 0.5) setEngaged(true);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // The banner is fixed to the bottom of the viewport, which parks it directly
  // on top of the footer's "not a brokerage / nothing here is financial advice"
  // disclaimer once you reach the end of a page. Obscuring that specific text
  // is the one thing this nudge must not do, so it steps aside whenever the
  // footer is in view and comes back when you scroll away.
  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer) return;
    const observer = new IntersectionObserver(([entry]) => setFooterVisible(entry.isIntersecting));
    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  if (!deferred || !engaged || footerVisible) return null;

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
        className="shrink-0 rounded-md bg-[#3ddc84] px-3 py-1.5 text-xs font-semibold text-black transition-opacity hover:opacity-90"
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
