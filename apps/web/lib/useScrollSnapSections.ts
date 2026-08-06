"use client";

import { useEffect, type RefObject } from "react";

/** Height of the sticky site header (SiteHeader's fixed `h-16`), which sits
 * over the top of whatever the page is scrolled to. */
const HEADER_HEIGHT = 64;

/** Breathing room between the header and the top of a snapped section. */
const SNAP_GAP = 12;

/** Two stops closer together than this collapse into one. A stop the visitor
 * can't perceive is a stop that costs them a whole gesture — this is what
 * makes the FAQ stop disappear on a tall screen where it's already in view
 * from the map stop. */
const MIN_STOP_SEPARATION = 96;

/** How far past the last stop the snapper stays engaged. Beyond it the page
 * scrolls normally in both directions, which is what keeps a long FAQ (and the
 * footer under it) readable instead of yanking back to the last stop on every
 * upward notch. */
const ZONE_SLACK = 40;

/** Treat "within this many pixels of a stop" as being at it, so a stop can
 * never snap to itself and stall the page. */
const AT_STOP_EPSILON = 8;

/**
 * How long wheel input is swallowed while the snap animation plays. Chrome
 * cancels an in-flight `behavior: "smooth"` scroll the moment it sees fresh
 * wheel input, so without this the animation would be aborted a frame or two
 * in by the rest of the visitor's own gesture and the page would stop
 * somewhere arbitrary: the exact "it moved on its own and then gave up" feel
 * this is meant to avoid.
 */
const SNAP_LOCK_MS = 420;

/**
 * Once the lock is up, each further wheel event pushes it out by this much.
 * A trackpad flick keeps emitting decaying events for up to a second after the
 * fingers lift, and without this that momentum tail reads as a second, third
 * and fourth gesture and cascades the page through every stop at once. A
 * deliberate second gesture has a much bigger gap than this in front of it.
 */
const MOMENTUM_QUIET_MS = 140;

/** Sub-pixel wheel noise (some mice emit a stray 1-2px event when the wheel
 * settles) shouldn't count as a gesture. */
const MIN_WHEEL_DELTA = 4;

/**
 * Marks a surface that handles the wheel itself, so the snapper never takes a
 * gesture aimed at it. The treemap carries it on its canvas: a wheel over the
 * map zooms the map, always, and that is worth more than being able to reach
 * the next stop without moving the pointer. Everywhere else on the page (the
 * margins, the sidebar, the headline, the FAQ) the wheel moves between stops.
 *
 * Put it on exactly the element that owns the `wheel` listener, so the two
 * can't drift apart.
 */
export const OWNS_WHEEL_ATTR = "data-owns-wheel";

/**
 * A section to snap to: a ref, or the id of an element rendered elsewhere on
 * the page (the FAQ lives in the server component that renders the map, so
 * there is no ref to hand down).
 */
export type SnapTarget = RefObject<HTMLElement | null> | string;

function resolveTarget(target: SnapTarget): HTMLElement | null {
  return typeof target === "string" ? document.getElementById(target) : target.current;
}

/** Whether the wheel would scroll something *inside* the page rather than the
 * page itself: the sidebar's own scroll box, a scrollable panel, an
 * `overflow-x-auto` chip row that also happens to overflow vertically. Those
 * have to keep working, so an event over one of them is left entirely alone. */
function scrollsAnInnerBox(node: EventTarget | null, deltaY: number): boolean {
  let el = node instanceof Element ? node : null;
  while (el && el !== document.body && el !== document.documentElement) {
    const overflowY = getComputedStyle(el).overflowY;
    if ((overflowY === "auto" || overflowY === "scroll") && el.scrollHeight > el.clientHeight + 1) {
      const room = deltaY > 0 ? el.scrollHeight - el.clientHeight - el.scrollTop > 1 : el.scrollTop > 1;
      if (room) return true;
    }
    el = el.parentElement;
  }
  return false;
}

/**
 * Turns the page into a small set of scroll stops, so one wheel gesture moves
 * between whole views instead of leaving the visitor to find the right scroll
 * offset by hand. On the homepage that's: the headline, the map framed on its
 * own, then the FAQ.
 *
 * Two things bound it, and between them they are why this can be always-on
 * without fighting anybody:
 *
 * 1. **It ignores the map.** A wheel over anything carrying OWNS_WHEEL_ATTR is
 *    left alone, so the treemap keeps plain wheel-to-zoom exactly as it always
 *    had it. The one exception is the very first downward gesture of a page
 *    load, which snaps the map into frame from wherever the pointer happens to
 *    be — the visitor has not decided to zoom anything yet, they are just
 *    trying to get to the content.
 * 2. **It stops at the last stop.** Past it the snapper disengages completely
 *    and the page scrolls normally, in both directions, until the visitor comes
 *    back up into the zone. That boundary is what makes this feel like the top
 *    of the page having structure rather than like the scrollbar being taken
 *    away.
 *
 * Wheel and keyboard only, never touch. A `touchmove` can be cancelled the same
 * way, but a finger already dragging the page is a direct-manipulation gesture:
 * taking it over mid-drag reads as the page fighting back, where the same
 * take-over of an indirect wheel notch reads as the page settling into place.
 *
 * @param targets Sections to stop at, in document order. Scroll offset 0 is
 *   always the first stop and doesn't need to be listed. Must be referentially
 *   stable (build it with useMemo), since it's an effect dependency.
 */
export function useScrollSnapSections(targets: readonly SnapTarget[]) {
  useEffect(() => {
    let lockUntil = 0;
    /** The one gesture allowed to snap from over the map. Spent by the first
     * wheel of the page load, whichever way it went: a visitor who opens the
     * page and immediately scrolls *up* is reading, not heading for the map.
     * Already-scrolled (a restored position, a deep link) means there was no
     * first gesture to catch. */
    let firstGestureUnspent = window.scrollY <= 8;

    /** Every stop, ascending, deduped. Recomputed per gesture rather than
     * cached: the map's height changes with the filter, the viewport, and the
     * time-machine banner appearing above it. */
    function stops(): number[] {
      const maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
      const raw = [0];
      for (const target of targets) {
        const el = resolveTarget(target);
        if (!el) continue;
        const documentTop = el.getBoundingClientRect().top + window.scrollY;
        raw.push(Math.min(Math.max(0, documentTop - HEADER_HEIGHT - SNAP_GAP), maxScroll));
      }
      raw.sort((a, b) => a - b);
      const deduped: number[] = [];
      for (const stop of raw) {
        if (deduped.length === 0 || stop - deduped[deduped.length - 1] >= MIN_STOP_SEPARATION) deduped.push(stop);
      }
      return deduped;
    }

    /** Where a gesture in this direction should land, or null to leave the
     * event alone (past the zone, or nothing left in that direction). */
    function nextStop(direction: 1 | -1): number | null {
      const all = stops();
      const last = all[all.length - 1] ?? 0;
      const y = window.scrollY;
      if (y > last + ZONE_SLACK) return null;
      if (direction > 0) return all.find((stop) => stop > y + AT_STOP_EPSILON) ?? null;
      for (let i = all.length - 1; i >= 0; i--) {
        if (all[i] < y - AT_STOP_EPSILON) return all[i];
      }
      return null;
    }

    function scrollToStop(top: number) {
      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      window.scrollTo({ top, behavior: reduced ? "auto" : "smooth" });
      lockUntil = performance.now() + (reduced ? MOMENTUM_QUIET_MS : SNAP_LOCK_MS);
    }

    /** Events this hook has no business touching at all, cheapest test first.
     * Deliberately does not include the over-the-map test, which has to run
     * after the animation lock (a wheel that lands on the map mid-glide still
     * has to be swallowed, or the map zooms under a page that is still moving). */
    function isForeign(e: WheelEvent): boolean {
      if (Math.abs(e.deltaY) < MIN_WHEEL_DELTA) return true;
      // A horizontal gesture (the mobile filter strip, a trackpad swipe).
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return true;
      // Ctrl/Cmd + wheel is a zoom, not a scroll: a trackpad pinch arrives this
      // way, and off a zoomable surface it's the browser's own page zoom.
      if (e.ctrlKey || e.metaKey) return true;
      // Nothing scrolls in fullscreen, and the map owns the whole screen there.
      if (document.fullscreenElement) return true;
      const el = e.target instanceof Element ? e.target : null;
      // An open dialog is the thing being scrolled, not the page behind it.
      if (el?.closest('[role="dialog"], [aria-modal="true"]')) return true;
      return scrollsAnInnerBox(e.target, e.deltaY);
    }

    function ownsItsOwnWheel(e: WheelEvent): boolean {
      const el = e.target instanceof Element ? e.target : null;
      return Boolean(el?.closest(`[${OWNS_WHEEL_ATTR}]`));
    }

    function onWheel(e: WheelEvent) {
      if (isForeign(e)) return;
      const now = performance.now();
      if (now < lockUntil) {
        e.preventDefault();
        e.stopPropagation();
        lockUntil = Math.max(lockUntil, now + MOMENTUM_QUIET_MS);
        return;
      }
      // The first gesture of the page load may snap from anywhere, including
      // from over the map; every one after it defers to whatever is under the
      // pointer. Spent here rather than at the end, so an upward first gesture
      // (a visitor reading, not heading for the map) uses it up too.
      const mayOverrule = firstGestureUnspent;
      firstGestureUnspent = false;
      if (!mayOverrule && ownsItsOwnWheel(e)) return;
      const target = nextStop(e.deltaY > 0 ? 1 : -1);
      if (target == null) return;
      e.preventDefault();
      e.stopPropagation();
      scrollToStop(target);
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const el = e.target as HTMLElement | null;
      // Never from a text field (Space and the paging keys are typing there),
      // nor from a control Space is about to activate.
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON|A|SUMMARY)$/.test(el.tagName))) return;
      let direction: 1 | -1 | null = null;
      if (e.key === "PageDown" || (e.key === " " && !e.shiftKey)) direction = 1;
      else if (e.key === "PageUp" || (e.key === " " && e.shiftKey)) direction = -1;
      if (direction == null) return;
      const target = nextStop(direction);
      if (target == null) return;
      firstGestureUnspent = false;
      e.preventDefault();
      scrollToStop(target);
    }

    window.addEventListener("wheel", onWheel, { passive: false, capture: true });
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("wheel", onWheel, { capture: true });
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [targets]);
}
