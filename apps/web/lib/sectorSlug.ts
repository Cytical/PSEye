import { PSE_SECTORS, type PseSector } from "@pseye/source-quotes";

/**
 * PSE_SECTORS minus "SME Board" — removed from sector browsing for now
 * (2026-07-29): PSE's own SME Board listing tier has much lighter disclosure
 * requirements than the six main boards, and grouping it in with them read
 * as more established than it is. Companies keep their real `sector: "SME
 * Board"` tag in the roster (screener/individual stock pages are unaffected)
 * — this only controls which sectors get a browsable /sectors card, a
 * rankings/screener filter option, a sitemap entry, or a slice of the market
 * map. Re-including it later is just removing the one filter below.
 */
export const VISIBLE_SECTORS: readonly PseSector[] = PSE_SECTORS.filter((s) => s !== "SME Board");

/** URL-safe slug for a PSE sector name — e.g. "Mining & Oil" -> "mining-and-oil",
 * "Holding Firms" -> "holding-firms". Used by /sectors/[sector] so a sector gets
 * a clean, indexable path instead of an encoded "&" or raw space in the URL. */
export function sectorToSlug(sector: PseSector): string {
  return sector
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\s+/g, "-");
}

const SLUG_TO_SECTOR = new Map(PSE_SECTORS.map((s) => [sectorToSlug(s), s]));

export function slugToSector(slug: string): PseSector | null {
  return SLUG_TO_SECTOR.get(slug) ?? null;
}
