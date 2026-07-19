import Link from "next/link";

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
          className="text-panel-fg/60"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
          <line x1="8.5" y1="8.5" x2="13.5" y2="13.5" />
        </svg>
      </div>
      <h1 className="mt-4 text-xl font-semibold tracking-tight text-panel-fg">Page not found</h1>
      <p className="mt-2 text-sm text-panel-fg/60">
        The page you&apos;re looking for doesn&apos;t exist or may have moved.
      </p>
      <div className="mt-6">
        <Link
          href="/"
          className="rounded-md border border-panel-border px-4 py-2 text-sm font-medium text-panel-fg transition-colors hover:bg-panel-raised"
        >
          Back to the market map
        </Link>
      </div>
    </div>
  );
}
