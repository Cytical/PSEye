import type { Transaction } from "./transactions";

/** Starting virtual balance for practice mode — the same "start with ₱100,000"
 * convention Investagram and similar PH paper-trading tools use, chosen for
 * that familiarity rather than any special significance of the number. */
export const PAPER_STARTING_CASH = 100_000;

/**
 * Cash left in a practice account after every buy/sell in its transaction log,
 * starting from PAPER_STARTING_CASH. Pure derivation, same "positions are
 * computed, never stored" approach as computePositions in transactions.ts — a
 * buy spends shares×price+fee, a sell credits shares×price−fee, mirroring
 * exactly how computePositions folds fees into cost basis/proceeds so the
 * two stay consistent with each other.
 */
export function computeCashBalance(transactions: Transaction[], startingCash: number = PAPER_STARTING_CASH): number {
  return transactions.reduce((cash, tx) => {
    const fee = tx.fee ?? 0;
    return tx.type === "buy" ? cash - (tx.shares * tx.price + fee) : cash + (tx.shares * tx.price - fee);
  }, startingCash);
}
