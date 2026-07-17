import type { Metadata } from "next";
import { MockBlockSaleSource } from "@pseye/source-block-sales";

export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Block Sales",
  description: "Large negotiated trades from PSE's Monthly Report, sorted by value.",
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
  const source = new MockBlockSaleSource();
  const trades = await source.getLatest();

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold">Block Sales</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Large negotiated trades (&quot;crosses&quot;) arranged directly between parties and
        executed outside the normal continuous order book, from PSE&apos;s Monthly Report.
        Sorted by trade value, largest first.
      </p>

      {trades.length > 0 ? (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left text-xs text-black/50 dark:border-white/10 dark:text-white/50">
                <th className="py-2 pr-4 font-medium">Date</th>
                <th className="py-2 pr-4 font-medium">Ticker</th>
                <th className="py-2 pr-4 font-medium">Company</th>
                <th className="py-2 pr-4 text-right font-medium">Volume</th>
                <th className="py-2 pr-4 text-right font-medium">Price</th>
                <th className="py-2 text-right font-medium">Value</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t) => (
                <tr
                  key={`${t.ticker}-${t.tradeDate}-${t.volume}`}
                  className="border-b border-black/5 dark:border-white/5"
                >
                  <td className="py-2 pr-4 text-black/60 dark:text-white/60">{formatDate(t.tradeDate)}</td>
                  <td className="py-2 pr-4 font-mono text-xs">{t.ticker}</td>
                  <td className="py-2 pr-4">{t.companyName}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">{t.volume.toLocaleString("en-PH")}</td>
                  <td className="py-2 pr-4 text-right tabular-nums">₱{t.price.toFixed(2)}</td>
                  <td className="py-2 text-right font-medium tabular-nums">{formatPeso(t.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="mt-6 text-sm text-black/50 dark:text-white/50">No block sales on record yet.</p>
      )}

      <p className="mt-6 text-xs text-black/40 dark:text-white/40">
        Sample data — a real PDF-table-extraction pipeline for PSE&apos;s Monthly Report has
        not been wired in yet. Figures here are illustrative, not actual trades.
      </p>
    </div>
  );
}
