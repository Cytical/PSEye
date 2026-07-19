"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

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
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
        </svg>
      </div>
      <h1 className="mt-4 text-xl font-semibold tracking-tight text-panel-fg">Something went wrong</h1>
      <p className="mt-2 text-sm text-panel-fg/60">
        This page hit an unexpected error. It&apos;s been logged — try again in a moment.
      </p>
      <div className="mt-6 flex items-center gap-2">
        <button
          type="button"
          onClick={unstable_retry}
          className="rounded-md border border-panel-border px-4 py-2 text-sm font-medium text-panel-fg transition-colors hover:bg-panel-raised"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-md px-4 py-2 text-sm font-medium text-panel-fg/60 transition-colors hover:text-panel-fg"
        >
          Back to market map
        </Link>
      </div>
    </div>
  );
}
