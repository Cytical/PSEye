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
 * Pairs the last real fetch timestamp with live market open/closed context,
 * instead of just a bare "Updated 4:16 PM PHT" that sits unchanged all
 * evening and looks stale to a visitor who doesn't know PSE's hours. The
 * timestamp itself is never faked forward to the current clock — that would
 * hide a genuinely broken ETL job behind a reassuring "just updated" label —
 * so the fix is framing, not a synthetic clock: "Market closed · last close
 * 4:16 PM PHT" explains *why* the time isn't moving instead of pretending it
 * is.
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

  return (
    <span className={className}>{status.open ? `Updated ${time} PHT` : `Market closed · last close ${time} PHT`}</span>
  );
}
