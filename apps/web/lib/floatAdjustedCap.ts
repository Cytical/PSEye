import { floatAdjustedMarketCap } from "@pseye/treemap-layout";

/**
 * The size every market-cap ranking and cap-weighted aggregate on the site
 * orders by: total market cap for almost every ticker, except MFC (Manulife)
 * and SLF (Sun Life) — two Canadian insurers cross-listed here with almost
 * none of their global shares trading on this exchange (0.20% and 0.62% free
 * float against a ₱4.15T and ₱2.66T reported cap, while real PH large caps
 * sit in the ₱300B-2T range) — which are sized by market cap × free float
 * instead, i.e. the part of the company actually available to trade on the
 * PSE. Ranked on the raw number those two took the top two slots on every
 * board and outweighed every genuine constituent in any cap-weighted
 * average, describing the Toronto listing rather than this market.
 *
 * 2026-08: narrowed from float-adjusting every ticker (the exact convention
 * PSEi/MSCI/FTSE use to weight an index) to just these two names, matching
 * how simpler public market-cap treemaps (finviz, TradingView) size their
 * boxes — plain total market cap — since the other 280 PH-domestic tickers'
 * outstanding-share count already is their real PSE float and there was no
 * reason to diverge from that convention for them. See
 * `FLOAT_ADJUSTED_TICKERS` in @pseye/treemap-layout for the exception list.
 *
 * The treemap market map has sized its boxes this way since 2026-07-22; the
 * shared implementation lives with it in @pseye/treemap-layout so the rankings
 * and the map can never drift apart. It falls back to raw market cap when a
 * quote has no free float — currently never on real data (all 282 tracked
 * tickers report one, verified 2026-07-29), but the mock source doesn't set the
 * field, so the fallback keeps a DB-less dev build ranking sensibly.
 */
export interface FloatAdjustable {
  ticker: string;
  marketCap: number;
  freeFloatPct?: number | null;
}

/** Market cap, float-adjusted only for MFC/SLF. See the module comment for why. */
export function investableMarketCap(quote: FloatAdjustable): number {
  // `floatAdjustedMarketCap` is typed against the treemap's own input shape,
  // which additionally carries sector/pctChange. Only ticker/marketCap/
  // freeFloatPct are read, so widening here keeps every caller from having to
  // hold a full TreemapInput just to ask how big a company is.
  return floatAdjustedMarketCap({ sector: "", pctChange: null, ...quote });
}

/** Descending comparator — the one sort order every ranking on the site uses. */
export function byInvestableCapDesc(a: FloatAdjustable, b: FloatAdjustable): number {
  return investableMarketCap(b) - investableMarketCap(a);
}
