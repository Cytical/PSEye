import Link from "next/link";

/**
 * Shortcut to /test's data-validation dashboard, styled and positioned to
 * sit directly beside Next's built-in dev indicator (the route/bundler
 * circle in the bottom-left corner). Next doesn't expose a public API to add
 * a custom entry into that indicator itself (checked `next-devtools`'s
 * internals — position/theme/scale are configurable, custom tabs aren't),
 * so this is a same-size circular button placed right next to it instead.
 * Assumes Next's indicator is left at its default `bottom-left` position
 * (devIndicators.position in next.config) — not rendered in production.
 */
export function DevToolsLink() {
  if (process.env.NODE_ENV === "production") return null;

  return (
    <Link
      href="/test"
      aria-label="Data validation dashboard"
      title="Data validation dashboard"
      className="fixed bottom-4 left-[68px] z-50 flex h-9 w-9 items-center justify-center rounded-full bg-[#0a0a0a] text-white shadow-lg ring-1 ring-white/10 transition-opacity hover:opacity-80"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-4 w-4"
        aria-hidden="true"
      >
        <path d="M9 3v6l-4 8a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-4-8V3" />
        <path d="M9 3h6" />
        <path d="M7 14h10" />
      </svg>
    </Link>
  );
}
