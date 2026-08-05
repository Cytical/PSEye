import { unstable_cache } from "next/cache";
import { createDb, getCompanyFinancials as getCompanyFinancialsQuery } from "@pseye/db";

export interface FinancialStatementFigure {
  current: number | null;
  previous: number | null;
}

export interface CompanyFinancials {
  /** PSE Edge's own phrasing, e.g. "Dec 31, 2025" — see the company_financials
   * schema doc comment for why this isn't parsed into a Date. */
  fiscalYearEnded: string | null;
  /** e.g. "PhP (in Millions)" — shown alongside every figure, not normalized. */
  currencyUnit: string | null;

  currentAssets: FinancialStatementFigure;
  totalAssets: FinancialStatementFigure;
  currentLiabilities: FinancialStatementFigure;
  totalLiabilities: FinancialStatementFigure;
  retainedEarnings: FinancialStatementFigure;
  stockholdersEquity: FinancialStatementFigure;
  stockholdersEquityParent: FinancialStatementFigure;
  bookValuePerShare: FinancialStatementFigure;

  grossRevenue: FinancialStatementFigure;
  grossExpense: FinancialStatementFigure;
  incomeBeforeTax: FinancialStatementFigure;
  netIncomeAfterTax: FinancialStatementFigure;
  netIncomeAttributableToParent: FinancialStatementFigure;
  earningsPerShareBasic: FinancialStatementFigure;
  earningsPerShareDiluted: FinancialStatementFigure;
}

/**
 * Ticker -> latest Annual Balance Sheet/Income Statement, populated by the
 * manual backfill in etl/jobs/backfill-company-financials.ts (not a recurring
 * ETL job — see that file's doc comment). Same "swap source without touching
 * callers" / fallback-to-empty contract as getCompanyProfiles: falls back to
 * {} (panel just doesn't render, not a fabricated statement) rather than
 * breaking the page on a missing or misconfigured DB.
 *
 * Wrapped in unstable_cache for the same reason as getCompanyProfiles: a
 * whole-table read fanned out across 282 ticker pages needs one shared cache,
 * not a per-page query.
 */
export const getCompanyFinancials = unstable_cache(fetchCompanyFinancials, ["company-financials"], {
  revalidate: 3600,
  tags: ["company-financials"],
});

function figure(current: string | null, previous: string | null): FinancialStatementFigure {
  return {
    current: current == null ? null : Number(current),
    previous: previous == null ? null : Number(previous),
  };
}

async function fetchCompanyFinancials(): Promise<Record<string, CompanyFinancials>> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return {};

  try {
    const db = createDb(databaseUrl);
    const rows = await getCompanyFinancialsQuery(db);

    const byTicker: Record<string, CompanyFinancials> = {};
    for (const row of rows) {
      byTicker[row.ticker] = {
        fiscalYearEnded: row.fiscalYearEnded,
        currencyUnit: row.currencyUnit,
        currentAssets: figure(row.currentAssetsCurrent, row.currentAssetsPrevious),
        totalAssets: figure(row.totalAssetsCurrent, row.totalAssetsPrevious),
        currentLiabilities: figure(row.currentLiabilitiesCurrent, row.currentLiabilitiesPrevious),
        totalLiabilities: figure(row.totalLiabilitiesCurrent, row.totalLiabilitiesPrevious),
        retainedEarnings: figure(row.retainedEarningsCurrent, row.retainedEarningsPrevious),
        stockholdersEquity: figure(row.stockholdersEquityCurrent, row.stockholdersEquityPrevious),
        stockholdersEquityParent: figure(row.stockholdersEquityParentCurrent, row.stockholdersEquityParentPrevious),
        bookValuePerShare: figure(row.bookValuePerShareCurrent, row.bookValuePerSharePrevious),
        grossRevenue: figure(row.grossRevenueCurrent, row.grossRevenuePrevious),
        grossExpense: figure(row.grossExpenseCurrent, row.grossExpensePrevious),
        incomeBeforeTax: figure(row.incomeBeforeTaxCurrent, row.incomeBeforeTaxPrevious),
        netIncomeAfterTax: figure(row.netIncomeAfterTaxCurrent, row.netIncomeAfterTaxPrevious),
        netIncomeAttributableToParent: figure(
          row.netIncomeAttributableToParentCurrent,
          row.netIncomeAttributableToParentPrevious
        ),
        earningsPerShareBasic: figure(row.earningsPerShareBasicCurrent, row.earningsPerShareBasicPrevious),
        earningsPerShareDiluted: figure(row.earningsPerShareDilutedCurrent, row.earningsPerShareDilutedPrevious),
      };
    }
    return byTicker;
  } catch (err) {
    console.error("getCompanyFinancials: DB read failed, falling back to no company financials", err);
    return {};
  }
}
