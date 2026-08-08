"use client";

import { useSyncExternalStore } from "react";

/** Optional free-text note + target price / stop-loss per ticker — additive to
 * the transaction log, not part of it (a note isn't a trade), so it lives in
 * its own localStorage key and is never touched by transaction migration. */
export interface PositionNote {
  note: string;
  targetPrice: number | null;
  stopLoss: number | null;
}

type NotesMap = Record<string, PositionNote>;

const STORAGE_KEY = "pseye:portfolio-notes";
const CHANGE_EVENT = "pseye:portfolionoteschange";

const EMPTY_NOTES: NotesMap = {};

let cachedRaw: string | null = null;
let cachedNotes: NotesMap = EMPTY_NOTES;

function readNotes(): NotesMap {
  if (typeof window === "undefined") return EMPTY_NOTES;
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw === cachedRaw) return cachedNotes;
  cachedRaw = raw;
  try {
    if (!raw) {
      cachedNotes = EMPTY_NOTES;
    } else {
      const parsed = JSON.parse(raw);
      cachedNotes = typeof parsed === "object" && parsed !== null && !Array.isArray(parsed) ? parsed : EMPTY_NOTES;
    }
  } catch {
    cachedNotes = EMPTY_NOTES;
  }
  return cachedNotes;
}

function writeNotes(notes: NotesMap): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

const EMPTY_NOTE: PositionNote = { note: "", targetPrice: null, stopLoss: null };

function setNote(ticker: string, patch: Partial<PositionNote>): void {
  const current = readNotes();
  const merged: PositionNote = { ...(current[ticker] ?? EMPTY_NOTE), ...patch };
  const next = { ...current };
  // Drop the entry entirely once it's back to fully empty, so clearing a note
  // doesn't leave a dead {note:"",targetPrice:null,stopLoss:null} row behind.
  if (!merged.note && merged.targetPrice == null && merged.stopLoss == null) {
    delete next[ticker];
  } else {
    next[ticker] = merged;
  }
  writeNotes(next);
}

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback); // cross-tab sync
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function emptySnapshot(): NotesMap {
  return EMPTY_NOTES;
}

export function usePortfolioNotes(): { notes: NotesMap; setNote: (ticker: string, patch: Partial<PositionNote>) => void } {
  const notes = useSyncExternalStore(subscribe, readNotes, emptySnapshot);
  return { notes, setNote };
}
