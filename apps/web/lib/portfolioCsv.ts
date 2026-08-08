import type { Transaction, TransactionType } from "./transactions";

const CSV_HEADER = "ticker,type,shares,price,date";

/** Serializes the transaction log for backup/export. Column order matches
 * parseTransactionsCsv below, so the same file round-trips through import. */
export function transactionsToCsv(transactions: Transaction[]): string {
  const rows = transactions.map((t) => `${t.ticker},${t.type},${t.shares},${t.price},${t.date}`);
  return [CSV_HEADER, ...rows].join("\n");
}

export interface ParsedCsvResult {
  transactions: Omit<Transaction, "id">[];
  /** One message per rejected line, so an import can report exactly what to fix
   * rather than failing the whole file over one bad row. */
  errors: string[];
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parses `ticker,type,shares,price,date` rows. A header row is recognized and
 * skipped by its first cell (case-insensitively "ticker"), not required.
 * Deliberately permissive about surrounding whitespace and blank lines, but
 * strict about each field's shape — a bad row is collected as an error and
 * skipped rather than aborting the whole import.
 */
export function parseTransactionsCsv(csv: string, validTickers: Set<string>): ParsedCsvResult {
  const lines = csv
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const transactions: Omit<Transaction, "id">[] = [];
  const errors: string[] = [];

  lines.forEach((line, i) => {
    const lineNo = i + 1;
    const cols = line.split(",").map((c) => c.trim());
    if (cols[0]?.toLowerCase() === "ticker") return; // header row

    if (cols.length < 5) {
      errors.push(`Line ${lineNo}: expected 5 columns (ticker,type,shares,price,date), got ${cols.length}`);
      return;
    }
    const [tickerRaw, typeRaw, sharesRaw, priceRaw, date] = cols;
    const ticker = tickerRaw.toUpperCase();
    const type = typeRaw.toLowerCase() as TransactionType;
    const shares = Number(sharesRaw);
    const price = Number(priceRaw);

    if (!validTickers.has(ticker)) {
      errors.push(`Line ${lineNo}: "${tickerRaw}" isn't a tracked PSE ticker`);
      return;
    }
    if (type !== "buy" && type !== "sell") {
      errors.push(`Line ${lineNo}: type must be "buy" or "sell", got "${typeRaw}"`);
      return;
    }
    if (!Number.isFinite(shares) || shares <= 0) {
      errors.push(`Line ${lineNo}: shares must be a positive number, got "${sharesRaw}"`);
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      errors.push(`Line ${lineNo}: price must be a positive number, got "${priceRaw}"`);
      return;
    }
    if (!DATE_RE.test(date)) {
      errors.push(`Line ${lineNo}: date must be YYYY-MM-DD, got "${date}"`);
      return;
    }

    transactions.push({ ticker, type, shares, price, date });
  });

  return { transactions, errors };
}
