"use client";

import { useRouter } from "next/navigation";
import { VISIBLE_SECTORS, sectorToSlug } from "@/lib/sectorSlug";

/**
 * Jumps straight from any sector to any other in one selection, instead of
 * clicking back to /sectors and then into another card (2 clicks). Shown on
 * both /sectors and /sectors/[sector] so switching never requires leaving
 * the page you're on.
 */
export function SectorSwitcher({ currentSector }: { currentSector?: string }) {
  const router = useRouter();

  return (
    <select
      value={currentSector ?? ""}
      onChange={(e) => {
        if (e.target.value) router.push(`/sectors/${e.target.value}`);
      }}
      aria-label="Jump to a sector"
      className="rounded-lg bg-panel px-3 py-2 text-sm text-panel-fg shadow-sm shadow-black/5 ring-1 ring-panel-border focus:outline-none focus:ring-2 focus:ring-panel-fg/30"
    >
      {!currentSector && (
        <option value="" disabled>
          Jump to a sector…
        </option>
      )}
      {VISIBLE_SECTORS.map((s) => (
        <option key={s} value={sectorToSlug(s)}>
          {s}
        </option>
      ))}
    </select>
  );
}
