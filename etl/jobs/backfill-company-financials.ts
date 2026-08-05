import "../lib/loadEnv";
import { sql } from "drizzle-orm";
import { createDb, companyFinancials } from "@pseye/db";
import { PSE_EDGE_COMPANIES, parseFinancialReportsHtml, type FinancialStatementFigure } from "@pseye/source-quotes";

const USER_AGENT =
  "Mozilla/5.0 (compatible; PHMarketEyeBot/1.0; +https://github.com/Cytical/PSEye) fetching public financial report pages";

/**
 * One-time backfill, not a scheduled job (no .github/workflows entry): a
 * company's Annual Balance Sheet / Income Statement only changes when it
 * files new full-year results (once a year), same reasoning as
 * backfill-company-profiles.ts. Upserts on ticker, so it's safe to rerun
 * (e.g. once a year after companies file fresh annual reports, or after the
 * roster in pseEdgeCompanyDirectory.ts changes).
 *
 * Run manually with a real DATABASE_URL: `pnpm --filter @pseye/etl backfill-company-financials`.
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
    if (!parsed) {
      console.warn(`No annual financial report found for ${company.ticker} (cmpy_id=${company.cmpyId})`);
      await sleep(300);
      continue;
    }

    const c = (f: FinancialStatementFigure) => f.current;
    const p = (f: FinancialStatementFigure) => f.previous;

    await db
      .insert(companyFinancials)
      .values({
        ticker: company.ticker,
        fetchedAt: new Date(),
        fiscalYearEnded: parsed.fiscalYearEnded,
        currencyUnit: parsed.currencyUnit,
        currentAssetsCurrent: c(parsed.currentAssets)?.toString(),
        currentAssetsPrevious: p(parsed.currentAssets)?.toString(),
        totalAssetsCurrent: c(parsed.totalAssets)?.toString(),
        totalAssetsPrevious: p(parsed.totalAssets)?.toString(),
        currentLiabilitiesCurrent: c(parsed.currentLiabilities)?.toString(),
        currentLiabilitiesPrevious: p(parsed.currentLiabilities)?.toString(),
        totalLiabilitiesCurrent: c(parsed.totalLiabilities)?.toString(),
        totalLiabilitiesPrevious: p(parsed.totalLiabilities)?.toString(),
        retainedEarningsCurrent: c(parsed.retainedEarnings)?.toString(),
        retainedEarningsPrevious: p(parsed.retainedEarnings)?.toString(),
        stockholdersEquityCurrent: c(parsed.stockholdersEquity)?.toString(),
        stockholdersEquityPrevious: p(parsed.stockholdersEquity)?.toString(),
        stockholdersEquityParentCurrent: c(parsed.stockholdersEquityParent)?.toString(),
        stockholdersEquityParentPrevious: p(parsed.stockholdersEquityParent)?.toString(),
        bookValuePerShareCurrent: c(parsed.bookValuePerShare)?.toString(),
        bookValuePerSharePrevious: p(parsed.bookValuePerShare)?.toString(),
        grossRevenueCurrent: c(parsed.grossRevenue)?.toString(),
        grossRevenuePrevious: p(parsed.grossRevenue)?.toString(),
        grossExpenseCurrent: c(parsed.grossExpense)?.toString(),
        grossExpensePrevious: p(parsed.grossExpense)?.toString(),
        incomeBeforeTaxCurrent: c(parsed.incomeBeforeTax)?.toString(),
        incomeBeforeTaxPrevious: p(parsed.incomeBeforeTax)?.toString(),
        netIncomeAfterTaxCurrent: c(parsed.netIncomeAfterTax)?.toString(),
        netIncomeAfterTaxPrevious: p(parsed.netIncomeAfterTax)?.toString(),
        netIncomeAttributableToParentCurrent: c(parsed.netIncomeAttributableToParent)?.toString(),
        netIncomeAttributableToParentPrevious: p(parsed.netIncomeAttributableToParent)?.toString(),
        earningsPerShareBasicCurrent: c(parsed.earningsPerShareBasic)?.toString(),
        earningsPerShareBasicPrevious: p(parsed.earningsPerShareBasic)?.toString(),
        earningsPerShareDilutedCurrent: c(parsed.earningsPerShareDiluted)?.toString(),
        earningsPerShareDilutedPrevious: p(parsed.earningsPerShareDiluted)?.toString(),
      })
      .onConflictDoUpdate({
        target: companyFinancials.ticker,
        set: {
          fetchedAt: sql`excluded.fetched_at`,
          fiscalYearEnded: sql`excluded.fiscal_year_ended`,
          currencyUnit: sql`excluded.currency_unit`,
          currentAssetsCurrent: sql`excluded.current_assets_current`,
          currentAssetsPrevious: sql`excluded.current_assets_previous`,
          totalAssetsCurrent: sql`excluded.total_assets_current`,
          totalAssetsPrevious: sql`excluded.total_assets_previous`,
          currentLiabilitiesCurrent: sql`excluded.current_liabilities_current`,
          currentLiabilitiesPrevious: sql`excluded.current_liabilities_previous`,
          totalLiabilitiesCurrent: sql`excluded.total_liabilities_current`,
          totalLiabilitiesPrevious: sql`excluded.total_liabilities_previous`,
          retainedEarningsCurrent: sql`excluded.retained_earnings_current`,
          retainedEarningsPrevious: sql`excluded.retained_earnings_previous`,
          stockholdersEquityCurrent: sql`excluded.stockholders_equity_current`,
          stockholdersEquityPrevious: sql`excluded.stockholders_equity_previous`,
          stockholdersEquityParentCurrent: sql`excluded.stockholders_equity_parent_current`,
          stockholdersEquityParentPrevious: sql`excluded.stockholders_equity_parent_previous`,
          bookValuePerShareCurrent: sql`excluded.book_value_per_share_current`,
          bookValuePerSharePrevious: sql`excluded.book_value_per_share_previous`,
          grossRevenueCurrent: sql`excluded.gross_revenue_current`,
          grossRevenuePrevious: sql`excluded.gross_revenue_previous`,
          grossExpenseCurrent: sql`excluded.gross_expense_current`,
          grossExpensePrevious: sql`excluded.gross_expense_previous`,
          incomeBeforeTaxCurrent: sql`excluded.income_before_tax_current`,
          incomeBeforeTaxPrevious: sql`excluded.income_before_tax_previous`,
          netIncomeAfterTaxCurrent: sql`excluded.net_income_after_tax_current`,
          netIncomeAfterTaxPrevious: sql`excluded.net_income_after_tax_previous`,
          netIncomeAttributableToParentCurrent: sql`excluded.net_income_attributable_to_parent_current`,
          netIncomeAttributableToParentPrevious: sql`excluded.net_income_attributable_to_parent_previous`,
          earningsPerShareBasicCurrent: sql`excluded.eps_basic_current`,
          earningsPerShareBasicPrevious: sql`excluded.eps_basic_previous`,
          earningsPerShareDilutedCurrent: sql`excluded.eps_diluted_current`,
          earningsPerShareDilutedPrevious: sql`excluded.eps_diluted_previous`,
        },
      });
    upserted++;
    await sleep(300);
  }

  console.log(`Upserted ${upserted}/${PSE_EDGE_COMPANIES.length} company financials`);
}

async function fetchOne(cmpyId: string) {
  try {
    const res = await fetch(`https://edge.pse.com.ph/companyPage/financial_reports_view.do?cmpy_id=${cmpyId}`, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!res.ok) {
      console.error(`backfill-company-financials: cmpy_id=${cmpyId} returned HTTP ${res.status}`);
      return null;
    }
    return parseFinancialReportsHtml(await res.text());
  } catch (err) {
    console.error(`backfill-company-financials: cmpy_id=${cmpyId} fetch failed`, err);
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
