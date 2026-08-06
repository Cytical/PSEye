import Link from "next/link";
import type { DeskCount } from "@/lib/news";

/**
 * The desk rail that runs under the masthead on /news and every
 * /news/[topic] page: the site's newspaper section strip.
 *
 * Sticky at `top-16`, directly beneath SiteHeader's fixed 64px height (see
 * that file's own comment, which is what other sticky elements on this site
 * offset against). A section front is a long page by nature, so the fastest
 * escape from a desk a reader does not care about should never be a scroll
 * back to the top.
 *
 * Horizontal scroll rather than wrap: eleven desks plus "Top stories" wraps
 * to three lines on a phone, and a three-line sticky bar eats the viewport it
 * is supposed to be helping navigate. `-mx-4 px-4` lets the scrolled content
 * bleed to the screen edge so a cut-off desk name reads as "there is more
 * this way" instead of as a layout bug.
 */
export function NewsDeskNav({ desks, current }: { desks: DeskCount[]; current?: string }) {
  if (desks.length === 0) return null;

  return (
    <nav
      aria-label="News desks"
      // Must be a direct child of the page's tall content column, not wrapped
      // in a spacing div: a sticky element only travels inside its containing
      // block, and a wrapper sized to the nav itself gives it nowhere to go.
      // Hence the mt-4 lives here rather than on a parent.
      className="sticky top-16 z-20 -mx-4 mt-4 border-y border-[#1A1210]/12 bg-[#FFF1E5]/95 backdrop-blur-sm sm:-mx-6 dark:border-[#F2E9E2]/12 dark:bg-[#14100E]/95"
    >
      <ul className="flex snap-x items-stretch gap-x-1 overflow-x-auto px-4 [scrollbar-width:none] sm:px-6 [&::-webkit-scrollbar]:hidden">
        <DeskLink href="/news" label="Top stories" active={current === undefined} />
        {desks.map((desk) => (
          <DeskLink
            key={desk.slug}
            href={`/news/${desk.slug}`}
            label={desk.topic}
            count={desk.count}
            active={current === desk.topic}
          />
        ))}
      </ul>
    </nav>
  );
}

function DeskLink({
  href,
  label,
  count,
  active,
}: {
  href: string;
  label: string;
  count?: number;
  active: boolean;
}) {
  return (
    <li className="snap-start">
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        // The active desk is marked with a claret underline rather than a
        // filled pill: it has to read as the current section of a newspaper,
        // and this is the same claret rule the kickers and section headings
        // already use.
        className={`font-news-sans flex h-11 items-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-[12px] font-semibold uppercase tracking-[0.08em] transition-colors ${
          active
            ? "border-[#990F3D] text-[#990F3D] dark:border-[#D75980] dark:text-[#D75980]"
            : "border-transparent text-[#1A1210]/70 hover:border-[#1A1210]/25 hover:text-[#1A1210] dark:text-[#F2E9E2]/70 dark:hover:border-[#F2E9E2]/25 dark:hover:text-[#F2E9E2]"
        }`}
      >
        {label}
        {count !== undefined && (
          <span className="font-mono text-[10px] font-normal tabular-nums opacity-55">{count}</span>
        )}
      </Link>
    </li>
  );
}
