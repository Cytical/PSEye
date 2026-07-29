import { floatAdjustedMarketCap } from "@pseye/treemap-layout";

/**
 * The size every market-cap ranking and cap-weighted aggregate on the site
 * orders by: market cap × free float, i.e. the part of a company actually
 * available to trade on the PSE.
 *
 * PSE Edge's "Market Capitalization" is Last Traded Price × total Outstanding
 * Shares. For an ordinary PH-listed company that is a fair proxy for size, but
 * Manulife (MFC) and Sun Life (SLF) are Canadian insurers cross-listed here
 * with almost none of their global shares trading on this exchange — 0.20% and
 * 0.62% free float against a ₱4.15T and ₱2.66T reported cap, while real PH
 * large caps sit in the ₱300B-2T range. Ranked on the raw number they took the
 * top two slots on every board and outweighed every genuine constituent in any
 * cap-weighted average, describing the Toronto listing rather than this market.
 *
 * Float-adjusting is what the PSEi itself does, along with MSCI and FTSE, so
 * this is the conventional measure rather than a workaround — and it fixes the
 * dual-listings as a special case of a rule that names no tickers. On the
 * current roster it moves MFC to #65 and SLF to #49 while leaving the familiar
 * blue chips in a sensible order at the top (ICT, SM, BDO, BPI, SMPH).
 *
 * The treemap market map has sized its boxes this way since 2026-07-22; the
 * shared implementation lives with it in @pseye/treemap-layout so the rankings
 * and the map can never drift apart. It falls back to raw market cap when a
 * quote has no free float — currently never on real data (all 282 tracked
 * tickers report one, verified 2026-07-29), but the mock source doesn't set the
 * field, so the fallback keeps a DB-less dev build ranking sensibly.
 */
export interface FloatAdjustable {
  marketCap: number;
  freeFloatPct?: number | null;
}

/** Market cap × free float, in pesos. See the module comment for why this and not raw cap. */
export function investableMarketCap(quote: FloatAdjustable): number {
  // `floatAdjustedMarketCap` is typed against the treemap's own input shape,
  // which additionally carries ticker/sector/pctChange. Only the two fields
  // above are read, so widening here keeps every caller from having to hold a
  // full TreemapInput just to ask how big a company is.
  return floatAdjustedMarketCap({ ticker: "", sector: "", pctChange: null, ...quote });
}

/** Descending comparator — the one sort order every ranking on the site uses. */
export function byInvestableCapDesc(a: FloatAdjustable, b: FloatAdjustable): number {
  return investableMarketCap(b) - investableMarketCap(a);
}
