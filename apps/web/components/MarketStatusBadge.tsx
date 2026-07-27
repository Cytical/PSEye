"use client";

import { useEffect, useState } from "react";
import { getMarketStatus, type MarketStatus } from "@/lib/marketStatus";

/**
 * The "Market open / Market closed" pill on the homepage.
 *
 * Client-side purely so it can stay true. The homepage is ISR with
 * `revalidate = 3600`, so anything computed during render is frozen into the
 * cached HTML for up to an hour — which meant the badge could go on claiming
 * "Market open" well after the 3:30pm close, and keep saying "Market closed"
 * for the first hour of a session. On a site that refuses to draw a synthetic
 * price chart because it would misrepresent real data, a status pill that is
 * confidently an hour wrong is the same kind of error.
 *
 * `initial` is the server's own reading, so the SSR markup and the first
 * client render agree (no hydration mismatch) and the pill is still correct
 * for a visitor with JavaScript off or during a cache miss. The effect then
 * re-reads the real clock on mount and once a minute after, which is
 * comfortably finer than the one-minute granularity of the open/close
 * boundaries themselves.
 */
export function MarketStatusBadge({ initial }: { initial: MarketStatus }) {
  const [status, setStatus] = useState(initial);

  useEffect(() => {
    const sync = () => setStatus(getMarketStatus());
    sync();
    const id = window.setInterval(sync, 60_000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <span className="flex items-center gap-1.5 rounded-full border border-panel-border bg-panel px-2 py-0.5 text-[10px] font-medium text-panel-fg/70">
      <span className={`h-1.5 w-1.5 rounded-full ${status.open ? "animate-pulse bg-up" : "bg-panel-fg/30"}`} />
      {status.label}
    </span>
  );
}
