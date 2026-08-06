import Link from "next/link";

interface FaqItem {
  q: string;
  a: string;
  /** Optional call-to-action appended after the answer — kept separate from
   * `a` (rather than making `a` a ReactNode) so `a` stays a plain string the
   * page's FAQPage JSON-LD can use verbatim. */
  href?: string;
  hrefLabel?: string;
}

/** One entry in the row of links closing the section out. */
interface FaqFooterLink {
  href: string;
  label: string;
  description: string;
}

/**
 * Numbered accordion (native <details>/<summary>, no client JS) so the FAQ
 * reads as a compact editorial component instead of a wall of always-visible
 * text — while keeping every answer in the DOM at all times (unlike a
 * JS-driven accordion that unmounts closed panels), so the FAQPage JSON-LD in
 * page.tsx still matches what a crawler actually sees in the markup.
 */
export function MarketMapFaq({
  items,
  large,
  intro,
  footerLinks,
}: {
  items: FaqItem[];
  /** Bumps the answer text (and the question a step further) up one size —
   * opt-in so the homepage's existing FAQ, sized for a dense landing page,
   * doesn't change just because a reading-focused page like Getting Started
   * wants larger text. */
  large?: boolean;
  /** One line under the heading. The section used to open straight into
   * question 01, which reads as a support page rather than as the end of a
   * landing page. */
  intro?: string;
  /** Closing row of "where to next" links. The FAQ is the last thing on the
   * homepage, so without it the page simply stops. */
  footerLinks?: FaqFooterLink[];
}) {
  return (
    <section className="mt-16 border-t border-foreground/10 pt-9">
      <p className="kicker text-foreground/65">Good to know</p>
      <h2 className="mt-1.5 font-serif text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
        Frequently asked questions
      </h2>
      {intro && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-foreground/65">{intro}</p>}
      {/* CSS multi-column, not a two-column grid. In a grid each row is as tall
          as its tallest cell, so opening question 01 left a blank the height of
          its own answer sitting under question 02. Columns just flow. */}
      <div className="mt-5 sm:columns-2 sm:gap-x-10">
        {items.map((item, i) => (
          <details
            key={item.q}
            // The whole row is the hit target and the whole row responds to
            // hover: as a bare bottom-bordered block with a text-only summary,
            // nothing about it said "this opens", and only the words themselves
            // were clickable.
            className="group break-inside-avoid border-b border-foreground/10"
            open={i === 0}
          >
            {/* The question is an <h3> inside the <summary>, not a bare span:
                jumping between headings is a primary way screen-reader users
                navigate a page, and with only the section's own <h2> in the
                outline the questions were invisible to that. Heading content is
                explicitly allowed in <summary>, and the h3 sits under the
                section's h2 so the outline stays well-formed. */}
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4 rounded-md py-4 pr-2 font-medium text-foreground/85 transition-colors hover:text-foreground group-open:text-foreground [&::-webkit-details-marker]:hidden">
              <h3 className={`flex gap-3 font-medium ${large ? "text-lg" : "text-base"}`}>
                <span className="font-mono text-xs text-foreground/50 transition-colors group-open:text-accent">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{item.q}</span>
              </h3>
              <svg
                aria-hidden
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mt-1.5 shrink-0 text-foreground/50 transition-transform duration-200 group-open:rotate-180"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </summary>

            <p className={`-mt-1 pb-4 pl-7 pr-6 leading-relaxed text-foreground/65 ${large ? "text-base" : "text-sm"}`}>
              {item.a}
              {item.href && (
                <>
                  {" "}
                  <Link href={item.href} className="whitespace-nowrap underline hover:text-foreground">
                    {item.hrefLabel ?? "Learn more →"}
                  </Link>
                </>
              )}
            </p>
          </details>
        ))}
      </div>

      {footerLinks && footerLinks.length > 0 && (
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="group flex flex-col gap-1 rounded-xl bg-panel p-4 ring-1 ring-panel-border transition-colors hover:bg-panel-raised"
            >
              <span className="flex items-center gap-1.5 text-sm font-medium text-panel-fg">
                {link.label}
                <span aria-hidden className="transition-transform group-hover:translate-x-0.5">
                  →
                </span>
              </span>
              <span className="text-xs leading-relaxed text-panel-fg/68">{link.description}</span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
