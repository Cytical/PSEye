import "../lib/loadEnv";
import { sql } from "drizzle-orm";
import { createDb, companyProfiles } from "@pseye/db";
import { PSE_EDGE_COMPANIES, parseCompanyInfoHtml } from "@pseye/source-quotes";
import { fetchWikipediaSummary } from "../lib/wikipediaSummary";

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
 * Wikipedia summary (fetchWikipediaSummary). Board member *names* are
 * deliberately not attempted here — PSE Edge only ever publishes a headcount,
 * never names, and SEC Philippines (which has the real General Information
 * Sheet) is fully bot-blocked (confirmed investigating the `offerings`
 * source) — there is no free source for that specific field.
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
          wikipediaTitle: sql`excluded.wikipedia_title`,
          wikipediaSummary: sql`excluded.wikipedia_summary`,
          wikipediaUrl: sql`excluded.wikipedia_url`,
        },
      });
    upserted++;
    await sleep(300);
  }

  console.log(`Upserted ${upserted}/${PSE_EDGE_COMPANIES.length} company profiles`);
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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
