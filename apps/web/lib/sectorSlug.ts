import { PSE_SECTORS, type PseSector } from "@pseye/source-quotes";

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
