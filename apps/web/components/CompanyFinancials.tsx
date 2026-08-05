import type { CompanyFinancials as CompanyFinancialsData, FinancialStatementFigure } from "@/lib/companyFinancials";
import { InfoTip } from "./InfoTip";
import { SubHead } from "./StockAnalytics";

interface Row {
  label: string;
  figure: FinancialStatementFigure;
  /** Per-share rows (Book Value, EPS) are always in absolute pesos, unlike
   * the aggregate rows above them, which PSE Edge often reports pre-scaled to
   * thousands/millions (see currencyUnit) — see companyFinancials.ts. */
  perShare?: boolean;
  /** Colors the current-year figure green/red by sign — reserved for rows
   * where a sign flip is the headline story (profit vs loss, a retained
   * deficit), not every row (assets/liabilities being positive is routine). */
  toneBySign?: boolean;
  info?: string;
  glossaryId?: string;
}

/**
 * Static server-rendered Annual Balance Sheet + Income Statement — the panel
 * body only, same "chrome belongs to the Panel wrapper" convention as
 * StockAnalytics. Source is PSE Edge's own "Financial Reports" tab (see
 * parseFinancialReports.ts); current vs previous fiscal year, same two-column
 * shape that page itself shows. Only rendered when the page has at least one
 * non-null current-year figure for the ticker — gated by the caller.
 */
export function CompanyFinancials({ data }: { data: CompanyFinancialsData }) {
  const balanceSheet: Row[] = [
    { label: "Current assets", figure: data.currentAssets },
    {
      label: "Total assets",
      figure: data.totalAssets,
      info: "Everything the company owns that has value — cash, receivables, inventory, property, equipment, investments — added up.",
      glossaryId: "total-assets",
    },
    { label: "Current liabilities", figure: data.currentLiabilities },
    {
      label: "Total liabilities",
      figure: data.totalLiabilities,
      info: "Everything the company owes — loans, bonds payable, accounts payable, accrued expenses — added up.",
      glossaryId: "total-liabilities",
    },
    {
      label: "Retained earnings/(deficit)",
      figure: data.retainedEarnings,
      toneBySign: true,
      info: "Cumulative profit kept in the business since incorporation, after all dividends paid out. Negative means accumulated losses exceed accumulated profit — a retained deficit.",
    },
    {
      label: "Stockholders' equity",
      figure: data.stockholdersEquity,
      info: "Total assets minus total liabilities — the portion of the balance sheet that belongs to shareholders rather than creditors, on paper.",
      glossaryId: "stockholders-equity",
    },
    { label: "Stockholders' equity — parent", figure: data.stockholdersEquityParent },
    {
      label: "Book value per share",
      figure: data.bookValuePerShare,
      perShare: true,
      info: "Stockholders' equity attributable to the parent, divided by shares outstanding — what each share would be worth on paper if the company were liquidated at exactly its balance-sheet value.",
      glossaryId: "book-value-per-share",
    },
  ];

  const incomeStatement: Row[] = [
    { label: "Gross revenue", figure: data.grossRevenue },
    { label: "Gross expense", figure: data.grossExpense },
    { label: "Income/(loss) before tax", figure: data.incomeBeforeTax, toneBySign: true },
    {
      label: "Net income/(loss) after tax",
      figure: data.netIncomeAfterTax,
      toneBySign: true,
      info: "What's left of revenue after every expense, interest cost, and tax for the fiscal year — the standard \"bottom line\" profit or loss figure.",
      glossaryId: "net-income",
    },
    {
      label: "Net income/(loss) — parent",
      figure: data.netIncomeAttributableToParent,
      toneBySign: true,
    },
    {
      label: "EPS (basic)",
      figure: data.earningsPerShareBasic,
      perShare: true,
      toneBySign: true,
      info: "Net income attributable to the parent, divided by weighted-average basic shares outstanding for the year — profit earned per share.",
      glossaryId: "earnings-per-share",
    },
    { label: "EPS (diluted)", figure: data.earningsPerShareDiluted, perShare: true, toneBySign: true },
  ];

  return (
    <div className="flex flex-col gap-3">
      {(data.fiscalYearEnded || data.currencyUnit) && (
        <p className="text-[10.5px] leading-tight text-panel-fg/55">
          {data.fiscalYearEnded && <>FY ended {data.fiscalYearEnded}</>}
          {data.fiscalYearEnded && data.currencyUnit && " · "}
          {data.currencyUnit && <>figures in {data.currencyUnit} except per-share rows</>}
        </p>
      )}
      <FinancialTable title="Balance sheet" rows={balanceSheet} />
      <FinancialTable title="Income statement" rows={incomeStatement} />
    </div>
  );
}

function FinancialTable({ title, rows }: { title: string; rows: Row[] }) {
  return (
    <div>
      <SubHead>{title}</SubHead>
      <table className="mt-1.5 w-full text-xs">
        <thead>
          <tr className="text-[10px] uppercase tracking-[0.04em] text-panel-fg/50">
            <th className="py-1 text-left font-medium">Item</th>
            <th className="py-1 pl-2 text-right font-medium">Current</th>
            <th className="py-1 pl-2 text-right font-medium">Previous</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-panel-border">
          {rows.map((row) => {
            const fmt = row.perShare ? formatPerShare : formatAmount;
            const currentTone =
              row.toneBySign && row.figure.current != null
                ? row.figure.current >= 0
                  ? "text-up"
                  : "text-down"
                : "text-panel-fg";
            return (
              <tr key={row.label}>
                <td className="py-1 pr-2 text-panel-fg/75">
                  {row.label}
                  {row.info && <InfoTip text={row.info} glossaryId={row.glossaryId} />}
                </td>
                <td className={`py-1 pl-2 text-right font-medium tabular-nums ${currentTone}`}>
                  {fmt(row.figure.current)}
                </td>
                <td className="py-1 pl-2 text-right tabular-nums text-panel-fg/55">{fmt(row.figure.previous)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function formatAmount(n: number | null): string {
  if (n == null) return "—";
  return n.toLocaleString("en-PH", { maximumFractionDigits: 0 });
}

function formatPerShare(n: number | null): string {
  if (n == null) return "—";
  return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** True when at least one current-year figure exists — the gate the caller
 * uses to decide whether the panel is worth rendering at all (a company that
 * appears in company_financials but has every field null shouldn't show an
 * all-dashes panel). */
export function hasAnyFinancialData(data: CompanyFinancialsData): boolean {
  return [
    data.totalAssets,
    data.totalLiabilities,
    data.stockholdersEquity,
    data.grossRevenue,
    data.netIncomeAfterTax,
  ].some((f) => f.current != null);
}
