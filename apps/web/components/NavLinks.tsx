"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

/** Always shown inline, in this order. */
const PRIMARY = [
  { href: "/", label: "Market Map" },
  { href: "/daily", label: "Daily Recap" },
  { href: "/news", label: "News" },
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
    label: "Screeners",
    links: [
      { href: "/screener", label: "Screener", description: "Filter and sort every tracked stock" },
      { href: "/dividends", label: "Dividends", description: "Highest trailing-12-month dividend yields" },
      { href: "/rankings", label: "Rankings", description: "Every stock ranked by market cap" },
      { href: "/most-active", label: "Most Active", description: "Highest-turnover stocks today" },
      { href: "/sectors", label: "Sectors", description: "Every company grouped by PSE sector" },
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
function useIsActive() {
  const pathname = usePathname();
  return (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function navLinkClass(active: boolean) {
  return active
    ? "border-b-2 border-accent pb-0.5 font-medium text-foreground"
    : "border-b-2 border-transparent pb-0.5 text-foreground/65 transition-colors hover:border-foreground/20 hover:text-foreground";
}

/**
 * Nav is split so Market Map, Daily Recap, and News stay one click away (the
 * three highest-traffic/most-frequently-updated pages) while the other 17
 * collapse behind four topic dropdowns instead of one flat "More" list, so
 * each menu stays short and scannable and its trigger label tells you what's
 * inside before you open it. `variant="stacked"` (mobile hamburger panel)
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
          className={navLinkClass(isActive(link.href))}
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
  const panelId = `nav-panel-${label.toLowerCase().replace(/\s+/g, "-")}`;
  const hasActiveChild = links.some((link) => isActive(link.href));

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
      className="relative"
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
        className={`flex items-center gap-1 ${navLinkClass(hasActiveChild)}`}
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
        <div
          id={panelId}
          className={`absolute top-full z-20 mt-2 flex w-72 flex-col rounded-lg bg-panel py-1.5 ring-1 ring-panel-border shadow-lg shadow-black/5 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={`flex flex-col gap-0.5 px-3.5 py-2 ${
                isActive(link.href) ? "bg-panel-active" : "hover:bg-panel-raised"
              }`}
            >
              <span className={isActive(link.href) ? "font-medium text-panel-fg" : "text-panel-fg"}>
                {link.label}
              </span>
              <span className="text-xs text-panel-fg/68">{link.description}</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
