import Link from "next/link";
import type { RankingRow } from "@/lib/rankings";
import { WatchlistStarButton } from "./WatchlistStarButton";

/** Peso market cap, abbreviated — matches ScreenerTable's formatMarketCap. */
function formatMarketCap(value: number): string {
  if (value >= 1e12) return `₱${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `₱${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `₱${(value / 1e6).toFixed(1)}M`;
  return `₱${value.toLocaleString("en-PH")}`;
}

function changeColor(pctChange: number): string {
  return pctChange >= 0 ? "text-[#30cc5a]" : "text-[#f6362f]";
}

export function RankingsTable({ rows, rankKey = "overallRank" }: { rows: RankingRow[]; rankKey?: "overallRank" | "sectorRank" }) {
  return (
    <div className="overflow-hidden rounded-lg bg-panel ring-1 ring-panel-border">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-panel-border text-left text-[10px] uppercase tracking-wide text-panel-fg/50">
              <th className="w-10 py-1.5 pl-3 font-medium">#</th>
              <th className="w-9 py-1.5" aria-label="Watchlist" />
              <th className="py-1.5 pr-4 font-medium">Company</th>
              <th className="py-1.5 pr-4 text-right font-medium">Price</th>
              <th className="py-1.5 pr-4 text-right font-medium">Change</th>
              <th className="py-1.5 pr-4 text-right font-medium">Market cap</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-panel-border">
            {rows.map((row) => (
              <tr key={row.ticker} className="transition-colors hover:bg-panel-raised">
                <td className="py-2.5 pl-3 tabular-nums text-panel-fg/50">{row[rankKey]}</td>
                <td className="py-2">
                  <WatchlistStarButton ticker={row.ticker} size={16} />
                </td>
                <td className="py-2.5 pr-4">
                  <Link href={`/stocks/${row.ticker}`} className="text-panel-fg hover:underline">
                    <span className="font-mono text-xs font-semibold">{row.ticker}</span>
                    <span className="ml-2 text-panel-fg/70">{row.companyName}</span>
                  </Link>
                </td>
                <td className="py-2.5 pr-4 text-right tabular-nums text-panel-fg">
                  {row.price == null ? <span className="text-panel-fg/40">N/A</span> : `₱${row.price.toFixed(2)}`}
                </td>
                <td className="py-2.5 pr-4 text-right font-medium tabular-nums">
                  {row.pctChange == null ? (
                    <span className="text-panel-fg/40">—</span>
                  ) : (
                    <span className={changeColor(row.pctChange)}>
                      {row.pctChange >= 0 ? "+" : ""}
                      {row.pctChange.toFixed(2)}%
                    </span>
                  )}
                </td>
                <td className="py-2.5 pr-4 text-right tabular-nums text-panel-fg">{formatMarketCap(row.marketCap)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
