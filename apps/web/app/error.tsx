"use client";

import { useEffect } from "react";

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
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="mt-2 text-sm text-black/60 dark:text-white/60">
        This page hit an unexpected error. It&apos;s been logged — try again in a moment.
      </p>
      <button
        type="button"
        onClick={unstable_retry}
        className="mt-6 inline-block rounded-md border border-black/10 px-4 py-2 text-sm font-medium hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
      >
        Try again
      </button>
    </div>
  );
}
