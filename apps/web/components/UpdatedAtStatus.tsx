"use client";

import { useEffect, useState } from "react";
import { getMarketStatus, type MarketStatus } from "@/lib/marketStatus";
import { formatUpdatedAt } from "./MarketSummaryBar";

interface UpdatedAtStatusProps {
  /** ISO timestamp of the last real ETL fetch (snapshot.capturedAt) — never faked. */
  capturedAt: string;
  /** Server's reading of market open/closed, so SSR and the first client render agree. */
  initialStatus: MarketStatus;
  className?: string;
}

/**
 * Fixed to Asia/Manila for the same hydration-safety reason as
 * MarketSummaryBar's formatUpdatedAt.
 */
function formatCapturedDate(capturedAt: string): string {
  return new Date(capturedAt).toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    timeZone: "Asia/Manila",
  });
}

/**
 * Pairs the last real fetch timestamp with live market open/closed context.
 * The timestamp itself is never faked forward to the current clock — that
 * would hide a genuinely broken ETL job behind a reassuring "just updated"
 * label. While the market is open, showing it ("Last updated at 2:47 PM
 * PHT") conveys real freshness.
 *
 * The closed state used to render a bare "Market closed" on the theory that
 * `capturedAt` is always that day's close and therefore redundant. It isn't:
 * most visits happen while the market is closed, so for most visitors the only
 * thing on screen anywhere near the map said nothing at all about WHICH
 * session they were looking at — a Sunday visitor and a Monday-lunchtime
 * visitor read the same three words over two different boards. It now always
 * carries a date.
 *
 * Client-side and re-synced on an interval for the same reason
 * MarketStatusBadge is: every page this renders on is ISR-cached for up to an
 * hour, so a status computed only at render time could keep claiming "Market
 * open" long after the 3:30pm close.
 */
export function UpdatedAtStatus({ capturedAt, initialStatus, className }: UpdatedAtStatusProps) {
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    const sync = () => setStatus(getMarketStatus());
    sync();
    const id = window.setInterval(sync, 60_000);
    return () => window.clearInterval(id);
  }, []);

  const time = formatUpdatedAt(capturedAt);

  if (!status.open) {
    return <span className={className}>{`Closed, as of ${formatCapturedDate(capturedAt)} ${time} PHT`}</span>;
  }

  return <span className={className}>{`Last updated at ${time} PHT`}</span>;
}
