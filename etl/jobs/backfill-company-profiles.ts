import "../lib/loadEnv";
import { sql } from "drizzle-orm";
import { createDb, companyProfiles } from "@pseye/db";
import { PSE_EDGE_COMPANIES, parseCompanyInfoHtml } from "@pseye/source-quotes";

const USER_AGENT =
  "Mozilla/5.0 (compatible; PSEyeBot/1.0; +https://github.com/pseye) fetching public company information pages";

/**
 * One-time backfill, not a scheduled job (no .github/workflows entry): a
 * company's business description, sourced from its PSE Edge "Company
 * Information" page (drawn from its own SEC Form 17-A filing), changes rarely
 * enough that a hand-triggered rerun beats a recurring cadence. Upserts on
 * ticker, so it's safe to rerun (e.g. after PSE relists a company or the
 * roster in pseEdgeCompanyDirectory.ts changes).
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

    await db
      .insert(companyProfiles)
      .values({
        ticker: company.ticker,
        description: parsed.description,
        source: parsed.citedSource ? `PSE Edge company profile — ${parsed.citedSource}` : "PSE Edge company profile",
        fetchedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: companyProfiles.ticker,
        set: {
          description: sql`excluded.description`,
          source: sql`excluded.source`,
          fetchedAt: sql`excluded.fetched_at`,
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
