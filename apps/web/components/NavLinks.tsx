"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Shown inline, in this order.
 *
 * `xlOnly` drops a link out of the inline row on narrower desktops. Between
 * `lg` (where the hamburger gives way to the inline nav) and `xl` the row plus
 * the search box are about 100px wider than the header, which used to make the
 * whole nav wrap onto a second line inside a bar fixed at 64px. Getting Started
 * is the one to give up there: it is in the row for first-time visitors rather
 * than for traffic, and it stays reachable in the footer, in the homepage FAQ,
 * and in the hamburger panel below `lg`.
 */
const PRIMARY: { href: string; label: string; xlOnly?: boolean }[] = [
  { href: "/", label: "Market Map" },
  { href: "/daily", label: "Daily Recap" },
  { href: "/news", label: "News" },
  { href: "/getting-started", label: "Getting Started", xlOnly: true },
];

interface NavLink {
  href: string;
  label: string;
  /** Shown under the label in the dropdown/mobile panel — the whole reason
   * a page like "Regime" or "Clusters" is discoverable at all. A bare list
   * of tool names told a visitor nothing about what they did or why they'd
   * click; one line of plain English does. */
  description: string;
}

/**
 * Four topic dropdowns instead of the original two ("Market Data" covering 5
 * pages, "Tools" covering all 12 others) — that second group had grown into
 * a single undifferentiated wall of 12 similar-sounding names (Screener,
 * Analytics, Market Stats, Clusters, Regime, Rankings, Most Active,
 * Sectors...), which was itself the discoverability problem: even a visitor
 * who *did* open the dropdown had no easy way to scan it or tell what most
 * of those pages actually did. Splitting by what a page is *for* (raw PSE
 * reports vs. browsing/ranking vs. computed quant metrics vs. interactive
 * calculators) keeps every menu to 4-5 items, each with a one-line
 * description instead of a bare name.
 */
const DROPDOWNS: { label: string; links: NavLink[] }[] = [
  {
    label: "Market Data",
    links: [
      { href: "/calendar", label: "Calendar", description: "Ex-dividend and corporate action dates" },
      { href: "/foreign-flow", label: "Foreign Flow", description: "Weekly net foreign buying vs. selling" },
      { href: "/block-sales", label: "Block Sales", description: "Large negotiated trades off the order book" },
      { href: "/disclosures", label: "Disclosures", description: "PSE filings, grouped by company" },
    ],
  },
  {
    label: "Browse",
    links: [
      { href: "/screener", label: "Explorer", description: "Filter and sort every tracked stock" },
      { href: "/dividends", label: "Dividends", description: "Highest trailing-12-month dividend yields" },
      { href: "/rankings", label: "Rankings", description: "Every stock ranked by market cap" },
      { href: "/most-active", label: "Most Active", description: "Highest-turnover stocks today" },
      { href: "/sectors", label: "Sectors", description: "Every company grouped by PSE sector" },
      { href: "/glossary", label: "Glossary", description: "Plain-English definitions for every term on the site" },
    ],
  },
  {
    label: "Analytics",
    links: [
      { href: "/analytics", label: "Analytics", description: "Volatility, beta, RSI, and correlation" },
      { href: "/market-stats", label: "Market Stats", description: "Market-wide breadth and dispersion" },
      { href: "/clusters", label: "Clusters", description: "Stocks grouped by how they actually trade" },
      { href: "/regime", label: "Regime", description: "Risk-on / risk-off market detection" },
    ],
  },
  {
    label: "Tools",
    links: [
      { href: "/portfolio", label: "Portfolio", description: "Track your holdings' live gain/loss" },
      { href: "/compare", label: "Compare", description: "Normalize % change across stocks" },
      { href: "/dca", label: "DCA Calculator", description: "Simulate cost-averaging into a stock" },
      { href: "/charts", label: "Charts", description: "TradingView charts (NASDAQ tickers)" },
    ],
  },
];
/**
 * Whether the visitor is driving a real pointer, which is what makes
 * hover-to-open a sane thing to do in the nav below.
 *
 * Gated on `pointer: fine` as well as `hover: hover`: a touchscreen reports a
 * hover for the instant of a tap, so on the coarse-pointer reading alone a tap
 * on a dropdown trigger both opens the menu (hover) and closes it (click),
 * which is to say it does nothing at all. Server-snapshots to false and reads
 * the live value through useSyncExternalStore, the same contract as
 * lib/useNarrowViewport.ts.
 */
const HOVER_QUERY = "(hover: hover) and (pointer: fine)";

function subscribeToHoverCapability(callback: () => void) {
  const mq = window.matchMedia(HOVER_QUERY);
  mq.addEventListener("change", callback);
  return () => mq.removeEventListener("change", callback);
}

function usePointerCanHover(): boolean {
  return useSyncExternalStore(
    subscribeToHoverCapability,
    () => window.matchMedia(HOVER_QUERY).matches,
    () => false,
  );
}

function useIsActive() {
  const pathname = usePathname();
  return (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The underline is a scaling `::after` bar rather than a `border-bottom` that
 * switches colour. A border can only pop in or out; this one wipes in from the
 * left on hover and is simply already at full width when the link is the
 * current page, so hovering the nav feels like a single continuous control
 * instead of eight independent on/off states. Same 2px, same position, so it
 * costs no layout and nothing in the header's tight width budget.
 */
function navLinkClass(active: boolean) {
  const base =
    "relative pb-1 transition-colors after:absolute after:inset-x-0 after:bottom-0 after:h-[2px] after:origin-left after:rounded-full after:transition-transform after:duration-200 after:content-['']";
  return active
    ? `${base} font-medium text-foreground after:scale-x-100 after:bg-accent`
    : `${base} text-foreground/65 after:scale-x-0 after:bg-foreground/30 hover:text-foreground hover:after:scale-x-100`;
}

/**
 * Nav is split so Market Map, Daily Recap, News, and Getting Started stay one
 * click away (the first three are the highest-traffic/most-frequently-updated
 * pages; Getting Started is deliberately here too, not for traffic, but so a
 * first-time visitor has an obvious "what is this site" link right in the
 * primary row instead of buried in a dropdown or only in the footer) while
 * the other 16 collapse behind four topic dropdowns instead of one flat
 * "More" list, so each menu stays short and scannable and its trigger label
 * tells you what's inside before you open it. `variant="stacked"` (mobile
 * hamburger panel)
 * keeps the same four groupings — each under its own section heading —
 * rather than flattening everything into one 20-link list, which had the
 * same "wall of names" problem as the old single "Tools" dropdown, just
 * vertical instead of horizontal.
 */
export function NavLinks({ variant = "inline" }: { variant?: "inline" | "stacked" }) {
  const isActive = useIsActive();

  if (variant === "stacked") {
    return (
      <>
        {PRIMARY.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive(link.href) ? "page" : undefined}
            className={navLinkClass(isActive(link.href))}
          >
            {link.label}
          </Link>
        ))}
        {DROPDOWNS.map((group) => (
          <div key={group.label} className="mt-1 flex flex-col gap-2 border-t border-foreground/10 pt-2.5">
            <span className="kicker text-foreground/65">{group.label}</span>
            {/* No description line here, unlike the desktop dropdown below: with
                17 links across four groups, a subtext line under each one turned
                the mobile panel into a long scroll of clutter — the label alone
                is enough once you're already looking at a short, grouped list. */}
            {group.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(link.href) ? "page" : undefined}
                className={navLinkClass(isActive(link.href))}
              >
                {link.label}
              </Link>
            ))}
          </div>
        ))}
      </>
    );
  }

  return (
    <>
      {PRIMARY.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={isActive(link.href) ? "page" : undefined}
          // shrink-0 across the row: with the header's nav now flex-nowrap, a
          // shrinkable item doesn't overflow, it wraps its own label onto a
          // second line inside a 64px bar, which is the same bug one level down.
          className={`shrink-0 whitespace-nowrap ${navLinkClass(isActive(link.href))} ${
            link.xlOnly ? "hidden xl:inline-block" : ""
          }`}
        >
          {link.label}
        </Link>
      ))}
      {DROPDOWNS.map((group, i) => (
        <NavDropdown
          key={group.label}
          label={group.label}
          links={group.links}
          isActive={isActive}
          align={i === DROPDOWNS.length - 1 ? "right" : "left"}
        />
      ))}
    </>
  );
}

function NavDropdown({
  label,
  links,
  isActive,
  align = "left",
}: {
  label: string;
  links: NavLink[];
  isActive: (href: string) => boolean;
  /** "right" for the rightmost trigger — a left-anchored w-72 panel there
   * risks running past the viewport's right edge (there's no scroll to
   * recover it), same reasoning a browser's own overflow menu anchors from
   * the side nearest the screen edge. */
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<number | null>(null);
  const panelId = `nav-panel-${label.toLowerCase().replace(/\s+/g, "-")}`;
  const hasActiveChild = links.some((link) => isActive(link.href));

  const pointerCanHover = usePointerCanHover();

  useEffect(() => () => {
    if (closeTimer.current != null) window.clearTimeout(closeTimer.current);
  }, []);

  function cancelClose() {
    if (closeTimer.current != null) {
      window.clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function onPointerEnter() {
    if (!pointerCanHover) return;
    cancelClose();
    setOpen(true);
  }

  /** Closes on a delay, not immediately: the panel hangs 8px below its trigger,
   * so the pointer necessarily leaves this element for a frame or two on its
   * way into the menu. The delay is what bridges that gap, and it also forgives
   * a pointer that clips a corner on its way to the item it wants. */
  function onPointerLeave() {
    if (!pointerCanHover) return;
    cancelClose();
    closeTimer.current = window.setTimeout(() => setOpen(false), 160);
  }

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setOpen(false);
      // Escape must put focus back on the trigger, not drop it on <body> —
      // otherwise the next Tab restarts from the top of the document and the
      // keyboard user loses their place in the nav entirely.
      triggerRef.current?.focus();
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={ref}
      className="relative shrink-0"
      onPointerEnter={onPointerEnter}
      onPointerLeave={onPointerLeave}
      // Tabbing past the last link should close the panel the same way clicking
      // outside does; without this the abandoned panel stays open over the page.
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          // ArrowDown is the conventional "open and enter" key for a nav
          // disclosure; without it a keyboard user has no way to open the
          // panel other than Enter/Space, and no way to land inside it.
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            requestAnimationFrame(() => ref.current?.querySelector("a")?.focus());
          }
        }}
        aria-expanded={open}
        // Only while the panel exists — it's conditionally rendered below, and
        // aria-controls referencing a missing id is invalid ARIA. aria-expanded
        // is what carries the state either way.
        aria-controls={open ? panelId : undefined}
        className={`flex items-center gap-1 whitespace-nowrap ${navLinkClass(hasActiveChild)}`}
      >
        {label}
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Disclosure pattern, deliberately not role="menu"/"menuitem": those roles
          are a contract that the widget implements the full APG menu keyboard
          model (arrow keys wrapping between items, Home/End, typeahead, focus
          trapped to one tab stop). This is a list of plain navigation links, so
          claiming the role while leaving that model unimplemented actively
          misleads a screen-reader user about how it behaves. The APG's own
          guidance is that site navigation should use a disclosure instead. */}
      {open && (
        // The 8px offset between trigger and panel is `pt-2` on a transparent
        // wrapper rather than `mt-2` on the panel itself, so the gap is part of
        // this element's hover area. With a margin, crossing it counted as
        // leaving the menu, and the panel closed under a pointer that was on
        // its way into it.
        <div
          className={`absolute top-full z-20 pt-2 ${align === "right" ? "right-0" : "left-0"}`}
        >
          <div
            id={panelId}
            className="animate-overlay-panel flex w-72 flex-col overflow-hidden rounded-lg bg-panel py-1.5 shadow-xl shadow-black/20 ring-1 ring-panel-border"
          >
            {links.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  // The accent rule on the left edge is the same marker the
                  // market map's sidebar uses for its active filter, so
                  // "you are here" reads identically in both places.
                  className={`relative flex flex-col gap-0.5 px-3.5 py-2 transition-colors ${
                    active
                      ? "bg-panel-active before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-accent before:content-['']"
                      : "hover:bg-panel-raised"
                  }`}
                >
                  <span className={active ? "font-medium text-panel-fg" : "text-panel-fg"}>{link.label}</span>
                  <span className="text-xs text-panel-fg/68">{link.description}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
