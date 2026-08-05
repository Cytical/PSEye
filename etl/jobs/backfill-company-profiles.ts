import "../lib/loadEnv";
import { sql } from "drizzle-orm";
import sharp from "sharp";
import { createDb, companyProfiles } from "@pseye/db";
import { PSE_EDGE_COMPANIES, parseCompanyInfoHtml, parseDirectorsAndManagementHtml } from "@pseye/source-quotes";
import { fetchWikipediaSummary } from "../lib/wikipediaSummary";
import { triggerRevalidate } from "../lib/triggerRevalidate";

const USER_AGENT =
  "Mozilla/5.0 (compatible; PHMarketEyeBot/1.0; +https://github.com/Cytical/PSEye) fetching public company information pages";

/**
 * One-time backfill, not a scheduled job (no .github/workflows entry): a
 * company's business description, sourced from its exchange "Company
 * Information" page (drawn from its own SEC Form 17-A filing), changes rarely
 * enough that a hand-triggered rerun beats a recurring cadence. Upserts on
 * ticker, so it's safe to rerun (e.g. after PSE relists a company or the
 * roster in pseEdgeCompanyDirectory.ts changes).
 *
 * 2026-07: also pulls the same page's Security/Contact Information tables
 * (incorporation date, external auditor, fiscal year end, a director *count*,
 * business address, website — see parseCompanyInfoHtml) and a best-effort
 * Wikipedia summary (fetchWikipediaSummary).
 *
 * 2026-08: also fetches PSE Edge's separate "Directors and Management" page
 * (`directors_and_management_list.do`) for the actual Board of Directors and
 * Management Officers rosters — a different endpoint from the one above, and
 * a real source despite the Security Information table on the Company
 * Information page only ever exposing a director *count*, never names (that
 * headcount-only field is a distinct dead end, unrelated to this one). Best
 * effort and independent of the description fetch: a company profile without
 * a director roster still gets upserted with empty arrays for both.
 *
 * Also fetches and reprocesses the logo image itself (see processLogo):
 * PSE Edge's source images are typically a small mark centered on a large
 * uniform-color canvas (Jollibee's is 614x600 with the mascot occupying a
 * sliver of it), which reads as "mostly blank" at the small size a logo
 * renders at in the UI. sharp's trim() crops that padding away before the
 * image is stored, so this can't be done with CSS alone at render time.
 *
 * Run manually with a real DATABASE_URL: `pnpm --filter @pseye/etl backfill-company-profiles`.
 */
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const db = createDb(databaseUrl);
  let upserted = 0;

  for (const company of PSE_EDGE_COMPANIES) {
    const parsed = await fetchOne(company.cmpyId);
    if (!parsed?.description) {
      console.warn(`No company description found for ${company.ticker} (cmpy_id=${company.cmpyId})`);
      await sleep(300);
      continue;
    }

    // Best-effort and independent of the PSE Edge fetch above — a Wikipedia
    // miss (the common case for smaller caps) never blocks storing the rest
    // of the profile. See fetchWikipediaSummary's doc comment for the
    // confidence gate (Wikidata-confirmed business match only, never a guess).
    const wiki = await fetchWikipediaSummary(company.companyName);
    const directors = await fetchDirectorsAndManagement(company.cmpyId);
    const logoImage = await processLogo(parsed.logoUrl);

    await db
      .insert(companyProfiles)
      .values({
        ticker: company.ticker,
        description: parsed.description,
        source: parsed.citedSource ? `Company profile — ${parsed.citedSource}` : "Company profile",
        fetchedAt: new Date(),
        businessAddress: parsed.businessAddress,
        website: parsed.website,
        incorporationDate: parsed.incorporationDate,
        numberOfDirectors: parsed.numberOfDirectors,
        externalAuditor: parsed.externalAuditor,
        fiscalYearEnd: parsed.fiscalYearEnd,
        logoImage,
        boardOfDirectors: directors?.boardOfDirectors ?? [],
        managementOfficers: directors?.managementOfficers ?? [],
        wikipediaTitle: wiki?.title ?? null,
        wikipediaSummary: wiki?.summary ?? null,
        wikipediaUrl: wiki?.url ?? null,
      })
      .onConflictDoUpdate({
        target: companyProfiles.ticker,
        set: {
          description: sql`excluded.description`,
          source: sql`excluded.source`,
          fetchedAt: sql`excluded.fetched_at`,
          businessAddress: sql`excluded.business_address`,
          website: sql`excluded.website`,
          incorporationDate: sql`excluded.incorporation_date`,
          numberOfDirectors: sql`excluded.number_of_directors`,
          externalAuditor: sql`excluded.external_auditor`,
          fiscalYearEnd: sql`excluded.fiscal_year_end`,
          logoImage: sql`excluded.logo_image`,
          boardOfDirectors: sql`excluded.board_of_directors`,
          managementOfficers: sql`excluded.management_officers`,
          wikipediaTitle: sql`excluded.wikipedia_title`,
          wikipediaSummary: sql`excluded.wikipedia_summary`,
          wikipediaUrl: sql`excluded.wikipedia_url`,
        },
      });
    upserted++;
    await sleep(300);
  }

  console.log(`Upserted ${upserted}/${PSE_EDGE_COMPANIES.length} company profiles`);

  // Without this, the site keeps serving whatever it had cached under the
  // "company-profiles" tag (up to the 1h wall-clock ceiling in
  // lib/companyProfiles.ts) even though this backfill just wrote fresh rows —
  // caught live during the 2026-08 board/logo rollout, where prod kept
  // showing pages with no About panel at all until this was called by hand.
  await triggerRevalidate(["company-profiles"], ["/"]);
}

async function fetchOne(cmpyId: string) {
  try {
    const res = await fetch(`https://edge.pse.com.ph/companyInformation/form.do?cmpy_id=${cmpyId}`, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) {
      console.error(`backfill-company-profiles: cmpy_id=${cmpyId} returned HTTP ${res.status}`);
      return null;
    }
    return parseCompanyInfoHtml(await res.text());
  } catch (err) {
    console.error(`backfill-company-profiles: cmpy_id=${cmpyId} fetch failed`, err);
    return null;
  }
}

async function fetchDirectorsAndManagement(cmpyId: string) {
  try {
    const res = await fetch(`https://edge.pse.com.ph/companyPage/directors_and_management_list.do?cmpy_id=${cmpyId}`, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) {
      console.error(`backfill-company-profiles: directors/management cmpy_id=${cmpyId} returned HTTP ${res.status}`);
      return null;
    }
    return parseDirectorsAndManagementHtml(await res.text());
  } catch (err) {
    console.error(`backfill-company-profiles: directors/management cmpy_id=${cmpyId} fetch failed`, err);
    return null;
  }
}

/** Longest edge a stored logo is resized to — comfortably larger than the
 * ~52-64px chip it renders in even at 2x DPI, without letting a data URI
 * balloon in size. */
const LOGO_MAX_DIMENSION = 160;

/**
 * Downloads a PSE Edge logo image and crops the uniform-color padding off
 * its edges (`sharp().trim()`, threshold 10 — PSE Edge's own canvases are
 * exactly one flat background color, so a low threshold is enough and avoids
 * eating into the mark itself), then resizes and re-encodes as WebP, and
 * returns it as a self-contained `data:image/webp;base64,...` string. Returns
 * null on any failure (no logo on file, a fetch error, or an image sharp
 * can't decode) — same "omit rather than fabricate" contract as the rest of
 * this job, and callers should treat null as "render no logo" rather than
 * retry or fall back to the untrimmed original.
 */
async function processLogo(logoUrl: string | null): Promise<string | null> {
  if (!logoUrl) return null;
  try {
    const res = await fetch(logoUrl, { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) {
      console.error(`backfill-company-profiles: logo fetch ${logoUrl} returned HTTP ${res.status}`);
      return null;
    }
    const bytes = Buffer.from(await res.arrayBuffer());
    const webp = await sharp(bytes)
      .trim({ threshold: 10 })
      .resize(LOGO_MAX_DIMENSION, LOGO_MAX_DIMENSION, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 90 })
      .toBuffer();
    return `data:image/webp;base64,${webp.toString("base64")}`;
  } catch (err) {
    console.error(`backfill-company-profiles: logo processing failed for ${logoUrl}`, err);
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
