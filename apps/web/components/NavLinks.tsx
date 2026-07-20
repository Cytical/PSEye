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

/**
 * Each becomes its own inline dropdown on desktop, shown flat (ungrouped) on
 * mobile, where vertical stacking has no scanability problem. Two separate
 * dropdowns (rather than one "More" dropdown with two labeled sections)
 * keeps each menu short and its topic obvious from the trigger label alone.
 */
const DROPDOWNS: { label: string; links: { href: string; label: string }[] }[] = [
  {
    label: "Market Data",
    links: [
      { href: "/dividends", label: "Dividends" },
      { href: "/calendar", label: "Calendar" },
      { href: "/foreign-flow", label: "Foreign Flow" },
      { href: "/block-sales", label: "Block Sales" },
      { href: "/disclosures", label: "Disclosures" },
    ],
  },
  {
    label: "Tools",
    links: [
      { href: "/charts", label: "Charts" },
      { href: "/compare", label: "Compare" },
      { href: "/dca", label: "DCA Calculator" },
    ],
  },
];
const ALL_DROPDOWN_LINKS = DROPDOWNS.flatMap((g) => g.links);

function useIsActive() {
  const pathname = usePathname();
  return (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

function navLinkClass(active: boolean) {
  return active ? "font-medium opacity-100" : "opacity-70 hover:opacity-100";
}

/**
 * Nav is split so Market Map, Daily Recap, and News stay one click away (the
 * three highest-traffic/most-frequently-updated pages) while the other nine
 * collapse behind two topic dropdowns — "Market Data" and "Tools" — instead
 * of one flat "More" list, so each menu stays short and its trigger label
 * tells you what's inside before you open it. `variant="stacked"` (mobile
 * hamburger panel) skips the dropdowns and lists everything flat, since
 * vertical stacking has no clutter problem there.
 */
export function NavLinks({ variant = "inline" }: { variant?: "inline" | "stacked" }) {
  const isActive = useIsActive();

  if (variant === "stacked") {
    return (
      <>
        {[...PRIMARY, ...ALL_DROPDOWN_LINKS].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive(link.href) ? "page" : undefined}
            className={navLinkClass(isActive(link.href))}
          >
            {link.label}
          </Link>
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
      {DROPDOWNS.map((group) => (
        <NavDropdown key={group.label} label={group.label} links={group.links} isActive={isActive} />
      ))}
    </>
  );
}

function NavDropdown({
  label,
  links,
  isActive,
}: {
  label: string;
  links: { href: string; label: string }[];
  isActive: (href: string) => boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const hasActiveChild = links.some((link) => isActive(link.href));

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-haspopup="menu"
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

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full z-20 mt-2 flex min-w-40 flex-col rounded-lg border border-black/10 bg-white py-1 shadow-lg dark:border-white/10 dark:bg-neutral-900"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              role="menuitem"
              onClick={() => setOpen(false)}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={`px-3 py-1.5 ${
                isActive(link.href)
                  ? "font-medium opacity-100"
                  : "opacity-80 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/5"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
