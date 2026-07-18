"use client";

import { useEffect } from "react";
import { recordView } from "@/lib/recentlyViewed";

/** Invisible — records this page visit into the recently-viewed list on mount. */
export function RecordStockView({ ticker }: { ticker: string }) {
  useEffect(() => {
    recordView(ticker);
  }, [ticker]);
  return null;
}
