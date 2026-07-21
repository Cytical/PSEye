import "../lib/loadEnv";
import { sql } from "drizzle-orm";
import { createDb, marketSnapshot } from "@pseye/db";
import { parseIndexSummaryHtml } from "@pseye/source-quotes";

const USER_AGENT =
  "Mozilla/5.0 (compatible; PSEyeBot/1.0; +https://github.com/pseye) fetching public EOD/delayed stock data pages";

/**
 * Runs every 15 min during PSE trading hours (see
 * .github/workflows/market-snapshot-15min.yml), same cadence as
 * fetch-quotes.ts — see that file's doc comment for why 15 min. Two sources,
 * both free/public:
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

  // The PSE Edge homepage's Index Summary widget is only populated
  // server-side intermittently — it's frequently blank (empty <tbody>) even
  // mid-session, then populated on other reads the same day (confirmed live:
  // the same widget produced a real PSEi value at 1pm one day and an empty
  // table the next morning). Since this job runs every 15 min, a blank widget
  // is an expected transient, not an error: soft-skip so the run stays green
  // and never overwrites a good PSEi already stored for today — a later run
  // (or the post-close settle run) captures it once the widget fills. USD/PHP
  // alone can't be stored (psei_* columns are NOT NULL), and it's ECB
  // daily-cadence anyway, so there's nothing lost by skipping.
  if (!index || usdPhpRate === null) {
    console.warn(
      `fetch-market-snapshot: incomplete data (index=${index ? "ok" : "empty"}, usdPhpRate=${usdPhpRate}); skipping this run.`
    );
    return;
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
