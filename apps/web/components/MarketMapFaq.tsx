interface FaqItem {
  q: string;
  a: string;
}

/**
 * Numbered accordion (native <details>/<summary>, no client JS) so the FAQ
 * reads as a compact editorial component instead of a wall of always-visible
 * text — while keeping every answer in the DOM at all times (unlike a
 * JS-driven accordion that unmounts closed panels), so the FAQPage JSON-LD in
 * page.tsx still matches what a crawler actually sees in the markup.
 */
export function MarketMapFaq({ items }: { items: FaqItem[] }) {
  return (
    <section className="mt-16 border-t border-foreground/10 pt-9">
      <p className="kicker text-foreground/65">Good to know</p>
      <h2 className="mt-1.5 font-serif text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
        Frequently asked questions
      </h2>
      <div className="mt-5 sm:grid sm:grid-cols-2 sm:gap-x-10">
        {items.map((item, i) => (
          <details key={item.q} className="group border-b border-foreground/10 py-4" open={i === 0}>
            <summary className="flex cursor-pointer list-none items-start justify-between gap-4 font-medium text-foreground [&::-webkit-details-marker]:hidden">
              <span className="flex gap-3">
                <span className="font-mono text-xs text-foreground/65">{String(i + 1).padStart(2, "0")}</span>
                <span>{item.q}</span>
              </span>
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
                className="mt-1 shrink-0 text-foreground/65 transition-transform duration-200 group-open:rotate-180"
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </summary>
            <p className="mt-2.5 pl-7 text-sm leading-relaxed text-foreground/65">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
