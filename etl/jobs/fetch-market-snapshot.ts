import "../lib/loadEnv";
import { sql } from "drizzle-orm";
import { createDb, marketSnapshot } from "@pseye/db";
import { parseIndexSummaryHtml } from "@pseye/source-quotes";

const USER_AGENT =
  "Mozilla/5.0 (compatible; PSEyeBot/1.0; +https://github.com/pseye) fetching public EOD/delayed stock data pages";

/**
 * Runs hourly during PSE trading hours (see .github/workflows/market-snapshot-hourly.yml),
 * same cadence as fetch-quotes.ts. Two sources, both free/public:
 *  - PSEi value/change: PSE Edge's homepage "Index Summary" widget (same legal
 *    tradeoff as PseEdgeQuoteSource — see docs/PLANNING.md Open Question #1).
 *  - USD/PHP rate: Frankfurter (frankfurter.dev), a free no-key API built on
 *    the ECB's daily reference rates. It's informational context for retail
 *    users, not a trading input, so ECB-cadence (not intraday) is fine.
 * Upserts one row per calendar day — "today's" reading, not an intraday history.
 */
async function main() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required");
  }

  const [index, usdPhpRate] = await Promise.all([fetchPseiSummary(), fetchUsdPhpRate()]);

  if (!index || usdPhpRate === null) {
    throw new Error(
      `fetch-market-snapshot: missing data (index=${index ? "ok" : "null"}, usdPhpRate=${usdPhpRate})`
    );
  }

  const db = createDb(databaseUrl);
  const snapshotDate = new Date().toISOString().slice(0, 10);

  await db
    .insert(marketSnapshot)
    .values({
      snapshotDate,
      pseiValue: index.value.toString(),
      pseiChange: index.change.toString(),
      pseiPctChange: index.pctChange.toString(),
      usdPhpRate: usdPhpRate.toString(),
      capturedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: marketSnapshot.snapshotDate,
      set: {
        pseiValue: sql`excluded.psei_value`,
        pseiChange: sql`excluded.psei_change`,
        pseiPctChange: sql`excluded.psei_pct_change`,
        usdPhpRate: sql`excluded.usd_php_rate`,
        capturedAt: sql`excluded.captured_at`,
      },
    });

  console.log(
    `Upserted market snapshot for ${snapshotDate}: PSEi ${index.value} (${index.pctChange}%), USD/PHP ${usdPhpRate}`
  );
}

async function fetchPseiSummary() {
  try {
    const res = await fetch("https://edge.pse.com.ph/", { headers: { "User-Agent": USER_AGENT } });
    if (!res.ok) {
      console.error(`fetch-market-snapshot: PSE Edge homepage returned HTTP ${res.status}`);
      return null;
    }
    return parseIndexSummaryHtml(await res.text());
  } catch (err) {
    console.error("fetch-market-snapshot: PSE Edge homepage fetch failed", err);
    return null;
  }
}

async function fetchUsdPhpRate(): Promise<number | null> {
  try {
    const res = await fetch("https://api.frankfurter.dev/v1/latest?base=USD&symbols=PHP");
    if (!res.ok) {
      console.error(`fetch-market-snapshot: Frankfurter returned HTTP ${res.status}`);
      return null;
    }
    const body = (await res.json()) as { rates?: { PHP?: number } };
    const rate = body.rates?.PHP;
    return typeof rate === "number" && Number.isFinite(rate) ? rate : null;
  } catch (err) {
    console.error("fetch-market-snapshot: Frankfurter fetch failed", err);
    return null;
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
