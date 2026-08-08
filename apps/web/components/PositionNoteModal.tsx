"use client";

import { useEffect, useRef, useState } from "react";
import type { PositionNote } from "@/lib/usePortfolioNotes";

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Edits one ticker's note + target price + stop-loss. Same dialog/focus-trap
 * shape as AddToWatchlistModal.tsx and CompanyDetailPanel.tsx. Purely additive
 * to the transaction log (a note isn't a trade), stored in its own
 * localStorage key — see usePortfolioNotes.ts. */
export function PositionNoteModal({
  ticker,
  initial,
  onSave,
  onClose,
}: {
  ticker: string;
  initial: PositionNote;
  onSave: (patch: Partial<PositionNote>) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const firstFieldRef = useRef<HTMLTextAreaElement>(null);
  const [note, setNote] = useState(initial.note);
  const [targetPrice, setTargetPrice] = useState(initial.targetPrice != null ? String(initial.targetPrice) : "");
  const [stopLoss, setStopLoss] = useState(initial.stopLoss != null ? String(initial.stopLoss) : "");

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    firstFieldRef.current?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
        return;
      }
      if (e.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const targetNum = targetPrice.trim() === "" ? null : Number(targetPrice);
    const stopNum = stopLoss.trim() === "" ? null : Number(stopLoss);
    onSave({
      note: note.trim(),
      targetPrice: targetNum != null && Number.isFinite(targetNum) && targetNum > 0 ? targetNum : null,
      stopLoss: stopNum != null && Number.isFinite(stopNum) && stopNum > 0 ? stopNum : null,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="position-note-heading"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className="flex w-full max-w-sm flex-col overflow-hidden rounded-xl bg-panel text-panel-fg ring-1 ring-panel-border shadow-2xl outline-none"
      >
        <form onSubmit={handleSave} className="flex flex-col gap-3 p-4">
          <h2 id="position-note-heading" className="text-sm font-bold tracking-tight">
            {ticker}: notes &amp; targets
          </h2>

          <label className="flex flex-col gap-1 text-xs text-panel-fg/72">
            Note (why you hold it, your thesis, anything)
            <textarea
              ref={firstFieldRef}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              className="rounded-md border border-panel-border bg-[var(--background)] px-2.5 py-1.5 text-sm text-panel-fg"
            />
          </label>

          <div className="flex gap-3">
            <label className="flex flex-1 flex-col gap-1 text-xs text-panel-fg/72">
              Target price (₱)
              <input
                type="number"
                min="0"
                step="0.01"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                className="rounded-md border border-panel-border bg-[var(--background)] px-2.5 py-1.5 text-sm text-panel-fg"
              />
            </label>
            <label className="flex flex-1 flex-col gap-1 text-xs text-panel-fg/72">
              Stop-loss (₱)
              <input
                type="number"
                min="0"
                step="0.01"
                value={stopLoss}
                onChange={(e) => setStopLoss(e.target.value)}
                className="rounded-md border border-panel-border bg-[var(--background)] px-2.5 py-1.5 text-sm text-panel-fg"
              />
            </label>
          </div>

          <div className="mt-1 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md px-3 py-1.5 text-sm font-medium text-panel-fg ring-1 ring-panel-border transition-colors hover:bg-panel-raised"
            >
              Cancel
            </button>
            <button type="submit" className="rounded-md bg-foreground px-3 py-1.5 text-sm font-medium text-background hover:opacity-90">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
