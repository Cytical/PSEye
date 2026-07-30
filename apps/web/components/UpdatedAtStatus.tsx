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
 * Pairs the last real fetch timestamp with live market open/closed context.
 * The timestamp itself is never faked forward to the current clock — that
 * would hide a genuinely broken ETL job behind a reassuring "just updated"
 * label. While the market is open, showing it ("Last updated at 2:47 PM
 * PHT") conveys real freshness. Once closed, `capturedAt` is always the
 * day's final close snapshot — it's the same value "last updated" would
 * show, so pairing "Market closed" with a redundant timestamp added nothing;
 * just "Market closed" says everything the closed state needs to.
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

  if (!status.open) {
    return <span className={className}>Market closed</span>;
  }

  const time = formatUpdatedAt(capturedAt);

  return <span className={className}>{`Last updated at ${time} PHT`}</span>;
}
