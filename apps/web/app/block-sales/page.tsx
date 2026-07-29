import type { Metadata } from "next";
import Link from "next/link";
import { getBlockSales } from "@/lib/blockSales";

export const revalidate = 86400; // daily; matches the ETL job's cadence

export const metadata: Metadata = {
  title: "PSE Block Sales — Large Negotiated Trades",
  description: "Large negotiated trades from PSE's Daily Quotation Report, sorted by value.",
  alternates: { canonical: "/block-sales" },
};

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatPeso(n: number): string {
  return `₱${Math.round(n).toLocaleString("en-PH")}`;
}

export default async function BlockSalesPage() {
  const { source, trades } = await getBlockSales();

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8">
      <p className="kicker text-accent">Market Data</p>
      <h1 className="mt-1 font-serif text-2xl font-semibold tracking-tight text-panel-fg sm:text-3xl">Block Sales</h1>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-panel-fg/65">
        Large negotiated trades (&quot;crosses&quot;) arranged directly between parties and
        executed outside the normal continuous order book, from PSE&apos;s Daily Quotation
        Report. Sorted by trade value, largest first, over the last 30 days.
      </p>

      {trades.length > 0 ? (
        <div className="mt-8 overflow-hidden rounded-xl bg-panel shadow-sm shadow-black/5 ring-1 ring-panel-border">
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:min-w-[560px] sm:text-sm">
              <thead>
                <tr className="kicker border-b border-panel-border bg-panel-raised/50 text-left text-panel-fg/68">
                  <th className="py-3 pl-3 pr-2 font-medium sm:pl-4 sm:pr-4">Date</th>
                  <th className="py-3 pr-2 font-medium sm:pr-4">Company</th>
                  {/* Raw share volume is hidden below sm — Value already tells the
                      trade's size in pesos, which is what makes a block sale
                      notable, without also needing the share count on a phone. */}
                  <th className="hidden py-3 pr-4 text-right font-medium sm:table-cell">Volume</th>
                  <th className="hidden py-3 pr-4 text-right font-medium sm:table-cell">Price</th>
                  <th className="py-3 pr-3 text-right font-medium sm:pr-4">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-panel-border">
                {trades.map((t) => (
                  <tr
                    key={`${t.ticker}-${t.tradeDate}-${t.volume}`}
                    className="transition-colors hover:bg-panel-raised"
                  >
                    <td className="py-2 pl-3 pr-2 whitespace-nowrap text-panel-fg/72 sm:py-2.5 sm:pl-4 sm:pr-4">
                      {formatDate(t.tradeDate)}
                    </td>
                    <td className="max-w-[130px] py-2 pr-2 sm:max-w-none sm:py-2.5 sm:pr-4">
                      <Link
                        href={`/stocks/${t.ticker}`}
                        className="flex items-center gap-1.5 text-panel-fg hover:underline"
                      >
                        <span className="shrink-0 font-mono text-[10px] font-semibold sm:text-xs">{t.ticker}</span>
                        <span className="min-w-0 flex-1 truncate text-panel-fg/70">{t.companyName}</span>
                      </Link>
                    </td>
                    <td className="hidden py-2.5 pr-4 text-right tabular-nums text-panel-fg sm:table-cell">
                      {t.volume.toLocaleString("en-PH")}
                    </td>
                    <td className="hidden py-2.5 pr-4 text-right tabular-nums text-panel-fg sm:table-cell">
                      ₱{t.price.toFixed(2)}
                    </td>
                    <td className="py-2 pr-3 text-right font-medium tabular-nums text-panel-fg sm:py-2.5 sm:pr-4">
                      {formatPeso(t.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="mt-8 rounded-xl bg-panel p-6 text-center text-sm text-panel-fg/72 shadow-sm shadow-black/5 ring-1 ring-panel-border">
          No block sales on record yet.
        </p>
      )}

      {source === "mock" && (
        <p className="mt-6 text-xs text-panel-fg/72">
          Sample data — no real block sales are on record yet for the last 30 days. Figures
          here are illustrative, not actual trades.
        </p>
      )}
    </div>
  );
}
