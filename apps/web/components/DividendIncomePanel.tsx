import Link from "next/link";
import type { DividendIncomeSummary } from "@/lib/dividendIncome";

function formatPeso(value: number): string {
  return `₱${value.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

/** Projected dividend income from current holdings, at their trailing-12-month
 * payout rate (lib/dividends.ts, the same figures /dividends shows) — plus
 * upcoming ex-dividend dates so "when do I actually get paid" has an answer,
 * not just an annualized total. Renders nothing when no holding pays a
 * dividend, same "omit rather than fake it" contract as the rest of the site. */
export function DividendIncomePanel({ summary }: { summary: DividendIncomeSummary }) {
  if (summary.rows.length === 0) return null;

  const nextUpcoming = summary.rows
    .filter((r) => r.nextExDate != null)
    .sort((a, b) => a.nextExDate!.localeCompare(b.nextExDate!))[0];

  return (
    <div className="rounded-xl bg-panel p-4 shadow-sm shadow-black/5 ring-1 ring-panel-border">
      <div className="kicker text-panel-fg/68">Projected dividend income</div>
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div>
          <div className="text-xs text-panel-fg/68">Per year, at current rates</div>
          <div className="mt-0.5 text-lg font-semibold tabular-nums text-panel-fg">{formatPeso(summary.totalProjectedAnnualIncome)}</div>
        </div>
        <div>
          <div className="text-xs text-panel-fg/68">Yield on dividend payers</div>
          <div className="mt-0.5 text-lg font-semibold tabular-nums text-panel-fg">
            {summary.portfolioYieldPct == null ? "N/A" : `${summary.portfolioYieldPct.toFixed(2)}%`}
          </div>
        </div>
        {nextUpcoming && (
          <div>
            <div className="text-xs text-panel-fg/68">Next ex-dividend date</div>
            <div className="mt-0.5 text-sm font-medium text-panel-fg">
              {nextUpcoming.ticker} &middot; {formatDate(nextUpcoming.nextExDate!)}
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="kicker border-b border-panel-border text-left text-panel-fg/68">
              <th className="py-1 pr-2 font-medium">Company</th>
              <th className="py-1 pr-2 text-right font-medium">₱/share TTM</th>
              <th className="py-1 pr-2 text-right font-medium">Annual income</th>
              <th className="py-1 pr-2 text-right font-medium">Next ex-date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-panel-border">
            {summary.rows.map((r) => (
              <tr key={r.ticker}>
                <td className="py-1.5 pr-2">
                  <Link href={`/stocks/${r.ticker}`} className="font-mono font-semibold text-panel-fg hover:underline">
                    {r.ticker}
                  </Link>
                </td>
                <td className="py-1.5 pr-2 text-right tabular-nums text-panel-fg">{r.ttmDividendPerShare.toFixed(2)}</td>
                <td className="py-1.5 pr-2 text-right tabular-nums text-panel-fg">{formatPeso(r.projectedAnnualIncome)}</td>
                <td className="py-1.5 pr-2 text-right tabular-nums text-panel-fg/72">
                  {r.nextExDate == null ? "N/A" : formatDate(r.nextExDate)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[11px] text-panel-fg/60">
        Projected at each stock&apos;s trailing-12-month payout rate, not a guarantee. See{" "}
        <Link href="/dividends" className="underline hover:text-panel-fg">
          the full dividend screener
        </Link>{" "}
        for every payer.
      </p>
    </div>
  );
}
