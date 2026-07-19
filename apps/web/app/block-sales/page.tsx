import type { Metadata } from "next";
import Link from "next/link";
import { getBlockSales } from "@/lib/blockSales";

export const revalidate = 86400; // daily; matches the ETL job's cadence

export const metadata: Metadata = {
  title: "Block Sales",
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
      <h1 className="text-2xl font-semibold tracking-tight text-panel-fg">Block Sales</h1>
      <p className="mt-1.5 text-sm text-panel-fg/60">
        Large negotiated trades (&quot;crosses&quot;) arranged directly between parties and
        executed outside the normal continuous order book, from PSE&apos;s Daily Quotation
        Report. Sorted by trade value, largest first, over the last 30 days.
      </p>

      {trades.length > 0 ? (
        <div className="mt-8 overflow-hidden rounded-lg bg-panel ring-1 ring-panel-border">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="border-b border-panel-border text-left text-[10px] uppercase tracking-wide text-panel-fg/50">
                  <th className="py-3 pl-4 pr-4 font-medium">Date</th>
                  <th className="py-3 pr-4 font-medium">Ticker</th>
                  <th className="py-3 pr-4 font-medium">Company</th>
                  <th className="py-3 pr-4 text-right font-medium">Volume</th>
                  <th className="py-3 pr-4 text-right font-medium">Price</th>
                  <th className="py-3 pr-4 text-right font-medium">Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-panel-border">
                {trades.map((t) => (
                  <tr
                    key={`${t.ticker}-${t.tradeDate}-${t.volume}`}
                    className="transition-colors hover:bg-panel-raised"
                  >
                    <td className="py-2.5 pl-4 pr-4 text-panel-fg/60">{formatDate(t.tradeDate)}</td>
                    <td className="py-2.5 pr-4 font-mono text-xs">
                      <Link href={`/stocks/${t.ticker}`} className="text-panel-fg hover:underline">
                        {t.ticker}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-4">
                      <Link href={`/stocks/${t.ticker}`} className="text-panel-fg hover:underline">
                        {t.companyName}
                      </Link>
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-panel-fg">
                      {t.volume.toLocaleString("en-PH")}
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-panel-fg">₱{t.price.toFixed(2)}</td>
                    <td className="py-2.5 pr-4 text-right font-medium tabular-nums text-panel-fg">
                      {formatPeso(t.value)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="mt-8 rounded-lg bg-panel p-6 text-center text-sm text-panel-fg/50 ring-1 ring-panel-border">
          No block sales on record yet.
        </p>
      )}

      {source === "mock" && (
        <p className="mt-6 text-xs text-panel-fg/60">
          Sample data — no real block sales are on record yet for the last 30 days. Figures
          here are illustrative, not actual trades.
        </p>
      )}
    </div>
  );
}
