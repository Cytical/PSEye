import type { Holding } from "./portfolio";

export type TransactionType = "buy" | "sell";

/** One buy or sell, ₱/share. Replaces the old single {ticker,shares,avgCost}
 * position model (2026-08-08) — current positions are now DERIVED from this
 * log via FIFO lot matching, see computePositions below. */
export interface Transaction {
  id: string;
  ticker: string;
  type: TransactionType;
  shares: number;
  price: number;
  date: string; // YYYY-MM-DD
  /** Broker commission + tax + exchange fees for this trade, ₱ total (not
   * per-share) — whatever the broker's confirmation slip actually shows.
   * Optional for backward compat with transactions recorded before fee
   * tracking existed (undefined ≡ 0 everywhere it's read). Folded into cost
   * basis on a buy and netted out of proceeds on a sell, see computePositions. */
  fee?: number;
}

/** Sentinel date for holdings migrated from the pre-transaction-log schema
 * (shares + avgCost only, no purchase date on record). Fixed and far in the
 * past so a migrated "opening balance" always sorts before any transaction a
 * visitor enters going forward, keeping FIFO lot order correct even though
 * the real purchase date is unknown. */
export const LEGACY_TRANSACTION_DATE = "2000-01-01";

interface LegacyHolding {
  ticker: string;
  shares: number;
  avgCost: number;
}

function isLegacyHolding(v: unknown): v is LegacyHolding {
  return (
    typeof v === "object" &&
    v !== null &&
    !("type" in v) &&
    typeof (v as LegacyHolding).ticker === "string" &&
    typeof (v as LegacyHolding).shares === "number" &&
    typeof (v as LegacyHolding).avgCost === "number"
  );
}

function isTransaction(v: unknown): v is Transaction {
  return (
    typeof v === "object" &&
    v !== null &&
    typeof (v as Transaction).id === "string" &&
    typeof (v as Transaction).ticker === "string" &&
    ((v as Transaction).type === "buy" || (v as Transaction).type === "sell") &&
    typeof (v as Transaction).shares === "number" &&
    typeof (v as Transaction).price === "number" &&
    typeof (v as Transaction).date === "string"
  );
}

/**
 * One-time upgrade from the pre-2026-08-08 schema (a single {ticker, shares,
 * avgCost} row per position, no transaction history) into a synthetic opening
 * "buy" transaction per legacy holding, so an existing portfolio keeps working
 * under the transaction-log model with no visible disruption. Applied on every
 * read rather than written back immediately (idempotent either way); the
 * on-disk format upgrades itself the next time the visitor adds a transaction.
 */
export function migrateLegacyEntries(raw: unknown[]): Transaction[] {
  const out: Transaction[] = [];
  raw.forEach((entry, i) => {
    if (isTransaction(entry)) {
      out.push(entry);
    } else if (isLegacyHolding(entry)) {
      out.push({
        id: `legacy-${entry.ticker}-${i}`,
        ticker: entry.ticker,
        type: "buy",
        shares: entry.shares,
        price: entry.avgCost,
        date: LEGACY_TRANSACTION_DATE,
      });
    }
  });
  return out;
}

export interface RealizedGainEntry {
  ticker: string;
  /** Date of the sell that realized this gain. */
  date: string;
  shares: number;
  /** Net of the sell's fee — what actually landed, not the gross shares × price. */
  proceeds: number;
  costBasis: number;
  gain: number;
}

export interface PositionsResult {
  /** Only tickers with shares > 0 remaining, sorted alphabetically. */
  positions: Holding[];
  /** One entry per sell transaction that matched at least one open lot. */
  realizedGains: RealizedGainEntry[];
  totalRealizedGain: number;
}

interface Lot {
  shares: number;
  price: number;
}

/**
 * FIFO lot accounting over the transaction log: a buy opens a lot, a sell
 * consumes the OLDEST open lots first (the conventional default cost-basis
 * method) and records a realized gain for the shares it matched. Transactions
 * are processed in date order (ties keep their original array order) so a
 * sell only ever matches lots opened on or before it.
 *
 * A sell for more shares than are on record (bad data entry, or a lot that
 * predates this log) matches only what's available rather than fabricating a
 * short position — the unmatched remainder is silently dropped. The add-
 * transaction form is expected to prevent this case at entry time by capping
 * a sell at the currently-held share count.
 *
 * Fees are folded in rather than tracked separately: a buy's lot cost is
 * shares×price+fee (so avgCost on the resulting position already reflects
 * what it actually cost to acquire), and a sell's proceeds are shares×price−fee
 * (so realized gain reflects what actually landed). This is the standard
 * accounting treatment, not a PSEye-specific convention.
 */
export function computePositions(transactions: Transaction[]): PositionsResult {
  const sorted = [...transactions].sort((a, b) => a.date.localeCompare(b.date));
  const lotsByTicker = new Map<string, Lot[]>();
  const realizedGains: RealizedGainEntry[] = [];

  for (const tx of sorted) {
    const lots = lotsByTicker.get(tx.ticker) ?? [];
    const fee = tx.fee ?? 0;
    if (tx.type === "buy") {
      const costPerShare = (tx.shares * tx.price + fee) / tx.shares;
      lots.push({ shares: tx.shares, price: costPerShare });
    } else {
      let remaining = tx.shares;
      let costBasis = 0;
      let matchedShares = 0;
      while (remaining > 0 && lots.length > 0) {
        const lot = lots[0];
        const take = Math.min(remaining, lot.shares);
        costBasis += take * lot.price;
        matchedShares += take;
        lot.shares -= take;
        remaining -= take;
        if (lot.shares <= 0) lots.shift();
      }
      if (matchedShares > 0) {
        // Fee prorated to the shares actually matched, in case an oversell was
        // capped just above — the full fee shouldn't land on a partial match.
        const feeForMatched = fee * (matchedShares / tx.shares);
        const proceeds = matchedShares * tx.price - feeForMatched;
        realizedGains.push({ ticker: tx.ticker, date: tx.date, shares: matchedShares, proceeds, costBasis, gain: proceeds - costBasis });
      }
    }
    lotsByTicker.set(tx.ticker, lots);
  }

  const positions: Holding[] = [];
  for (const [ticker, lots] of lotsByTicker) {
    const shares = lots.reduce((s, l) => s + l.shares, 0);
    if (shares <= 0) continue;
    const costValue = lots.reduce((s, l) => s + l.shares * l.price, 0);
    positions.push({ ticker, shares, avgCost: costValue / shares });
  }
  positions.sort((a, b) => a.ticker.localeCompare(b.ticker));

  return {
    positions,
    realizedGains,
    totalRealizedGain: realizedGains.reduce((s, r) => s + r.gain, 0),
  };
}

/** Shares currently held for one ticker — what a sell form should cap against. */
export function sharesHeld(transactions: Transaction[], ticker: string): number {
  return computePositions(transactions).positions.find((p) => p.ticker === ticker)?.shares ?? 0;
}
