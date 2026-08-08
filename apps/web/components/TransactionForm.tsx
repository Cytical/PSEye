"use client";

import { useId, useRef, useState } from "react";
import { PSE_EDGE_COMPANIES } from "@pseye/source-quotes";
import { sharesHeld, type Transaction, type TransactionType } from "@/lib/transactions";
import { parseTransactionsCsv } from "@/lib/portfolioCsv";
import type { NewTransaction } from "@/lib/usePortfolioTransactions";

const TICKER_SET = new Set(PSE_EDGE_COMPANIES.map((c) => c.ticker));

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Add-transaction form (buy or sell, with date) plus a CSV bulk-import
 * control. A sell is capped at the ticker's currently-held share count —
 * computePositions' FIFO matcher would silently clip an oversell rather than
 * error, so the form is what actually stops it from being entered at all. */
export function TransactionForm({
  transactions,
  onAdd,
  onImport,
}: {
  transactions: Transaction[];
  onAdd: (tx: NewTransaction) => void;
  onImport: (txs: NewTransaction[]) => void;
}) {
  const [ticker, setTicker] = useState("");
  const [type, setType] = useState<TransactionType>("buy");
  const [shares, setShares] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState(todayIso);
  const [error, setError] = useState<string | null>(null);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importSuccessCount, setImportSuccessCount] = useState<number | null>(null);
  const datalistId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const normalizedTicker = ticker.trim().toUpperCase();
    const sharesNum = Number(shares);
    const priceNum = Number(price);

    if (!TICKER_SET.has(normalizedTicker)) {
      setError(`"${ticker}" isn't a tracked PSE ticker.`);
      return;
    }
    if (!Number.isFinite(sharesNum) || sharesNum <= 0) {
      setError("Shares must be a positive number.");
      return;
    }
    if (!Number.isFinite(priceNum) || priceNum <= 0) {
      setError("Price must be a positive number.");
      return;
    }
    if (!date) {
      setError("Pick a date.");
      return;
    }
    if (type === "sell") {
      const held = sharesHeld(transactions, normalizedTicker);
      if (sharesNum > held) {
        setError(`You only have ${held.toLocaleString("en-PH")} shares of ${normalizedTicker} on record.`);
        return;
      }
    }

    onAdd({ ticker: normalizedTicker, type, shares: sharesNum, price: priceNum, date });
    setTicker("");
    setShares("");
    setPrice("");
    setError(null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file after a fix
    if (!file) return;

    file.text().then((text) => {
      const { transactions: parsed, errors } = parseTransactionsCsv(text, TICKER_SET);
      setImportErrors(errors);
      setImportSuccessCount(parsed.length > 0 ? parsed.length : null);
      if (parsed.length > 0) onImport(parsed);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <form onSubmit={handleAdd} className="flex flex-wrap items-end gap-3 rounded-xl bg-panel p-4 shadow-sm shadow-black/5 ring-1 ring-panel-border">
        <div className="flex flex-col gap-1">
          <label htmlFor="tx-ticker" className="text-xs text-panel-fg/72">
            Ticker
          </label>
          <input
            id="tx-ticker"
            list={datalistId}
            value={ticker}
            onChange={(e) => setTicker(e.target.value)}
            placeholder="e.g. BDO"
            className="w-28 rounded-md border border-foreground/15 bg-transparent px-2.5 py-1.5 text-sm uppercase"
          />
          <datalist id={datalistId}>
            {PSE_EDGE_COMPANIES.map((c) => (
              <option key={c.ticker} value={c.ticker}>
                {c.companyName}
              </option>
            ))}
          </datalist>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="tx-type" className="text-xs text-panel-fg/72">
            Type
          </label>
          <select
            id="tx-type"
            value={type}
            onChange={(e) => setType(e.target.value as TransactionType)}
            className="rounded-md border border-foreground/15 bg-transparent px-2.5 py-1.5 text-sm"
          >
            <option value="buy">Buy</option>
            <option value="sell">Sell</option>
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="tx-shares" className="text-xs text-panel-fg/72">
            Shares
          </label>
          <input
            id="tx-shares"
            type="number"
            min="0"
            step="1"
            value={shares}
            onChange={(e) => setShares(e.target.value)}
            placeholder="100"
            className="w-24 rounded-md border border-foreground/15 bg-transparent px-2.5 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="tx-price" className="text-xs text-panel-fg/72">
            Price (₱/share)
          </label>
          <input
            id="tx-price"
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="120.50"
            className="w-28 rounded-md border border-foreground/15 bg-transparent px-2.5 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="tx-date" className="text-xs text-panel-fg/72">
            Date
          </label>
          <input
            id="tx-date"
            type="date"
            value={date}
            max={todayIso()}
            onChange={(e) => setDate(e.target.value)}
            className="rounded-md border border-foreground/15 bg-transparent px-2.5 py-1.5 text-sm"
          />
        </div>
        <button type="submit" className="rounded-md bg-foreground px-4 py-1.5 text-sm font-medium text-background hover:opacity-90">
          Add
        </button>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-md px-3 py-1.5 text-sm font-medium text-panel-fg ring-1 ring-panel-border transition-colors hover:bg-panel-raised"
        >
          Import CSV
        </button>
        <input ref={fileInputRef} type="file" accept=".csv,text/csv" onChange={handleFileChange} className="hidden" />
      </form>
      {error && <p className="text-xs text-down">{error}</p>}
      {importSuccessCount != null && (
        <p className="text-xs text-up">
          Imported {importSuccessCount} transaction{importSuccessCount === 1 ? "" : "s"}.
        </p>
      )}
      {importErrors.length > 0 && (
        <div className="text-xs text-down">
          <p>{importErrors.length} row{importErrors.length === 1 ? "" : "s"} skipped:</p>
          <ul className="ml-4 list-disc">
            {importErrors.slice(0, 5).map((err, i) => (
              <li key={i}>{err}</li>
            ))}
            {importErrors.length > 5 && <li>and {importErrors.length - 5} more.</li>}
          </ul>
        </div>
      )}
      <p className="text-xs text-panel-fg/65">
        CSV format: <code className="rounded bg-panel-raised px-1 py-0.5">ticker,type,shares,price,date</code> (date as
        YYYY-MM-DD, type as buy/sell). A header row is fine. Adding a buy also stars that ticker on your{" "}
        <a href="/watchlist" className="underline hover:text-panel-fg">
          watchlist
        </a>
        ; selling does not un-star it.
      </p>
    </div>
  );
}
