import Link from "next/link";
import { TickerSearch } from "@/components/TickerSearch";

/**
 * Most 404s here are a mistyped or stale company URL — there are ~282
 * /stocks/[ticker] pages and only a handful of flat routes, so the odds
 * favour "you meant a ticker". A lone "back to the market map" button made
 * that a dead end and pushed the recovery work back onto the visitor; the
 * search box is the same one in the header, which on mobile is otherwise
 * hidden behind the hamburger and easy to miss from here.
 */
const SUGGESTED = [
  { href: "/stocks", label: "All stocks" },
  { href: "/daily", label: "Daily recap" },
  { href: "/news", label: "News" },
  { href: "/screener", label: "Screener" },
];

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-panel ring-1 ring-panel-border">
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-panel-fg/72"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="8.5" y1="8.5" x2="13.5" y2="13.5" />
        </svg>
      </div>
      <h1 className="mt-4 text-xl font-semibold tracking-tight text-panel-fg">Page not found</h1>
      <p className="mt-2 text-sm text-panel-fg/72">
        The page you&apos;re looking for doesn&apos;t exist or may have moved. If you were after a
        company, search for it by ticker or name.
      </p>

      <div className="mt-6 w-full max-w-xs">
        <TickerSearch />
      </div>

      <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
        <Link
          href="/"
          className="rounded-md border border-panel-border px-4 py-2 text-sm font-medium text-panel-fg transition-colors hover:bg-panel-raised"
        >
          Back to the market map
        </Link>
      </div>

      <nav aria-label="Suggested pages" className="mt-5 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm">
        {SUGGESTED.map((link) => (
          <Link key={link.href} href={link.href} className="text-panel-fg/72 underline-offset-4 hover:text-panel-fg hover:underline">
            {link.label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
