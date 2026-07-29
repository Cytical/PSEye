import Link from "next/link";
import type { VolumeLeaderRow } from "@/lib/volumeLeaders";
import { WatchlistStarButton } from "./WatchlistStarButton";

/** Peso value, abbreviated — same formatter shape as RankingsTable's formatMarketCap. */
function formatPeso(value: number): string {
  if (value >= 1e12) return `₱${(value / 1e12).toFixed(2)}T`;
  if (value >= 1e9) return `₱${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `₱${(value / 1e6).toFixed(1)}M`;
  return `₱${value.toLocaleString("en-PH")}`;
}

function formatShares(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(2)}B`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(0)}K`;
  return value.toLocaleString("en-PH");
}

function changeColor(pctChange: number): string {
  return pctChange >= 0 ? "text-up" : "text-down";
}

export function VolumeLeadersTable({ rows }: { rows: VolumeLeaderRow[] }) {
  return (
    <div className="overflow-hidden rounded-xl bg-panel shadow-sm shadow-black/5 ring-1 ring-panel-border">
      <div className="overflow-x-auto">
        <table className="w-full text-xs sm:min-w-[680px] sm:text-sm">
          <thead>
            <tr className="kicker border-b border-panel-border bg-panel-raised/50 text-left text-panel-fg/68">
              <th className="w-8 py-1.5 pl-2 font-medium sm:w-10 sm:pl-3">#</th>
              <th className="w-7 py-1.5 sm:w-9" aria-label="Watchlist" />
              <th className="py-1.5 pr-2 font-medium sm:pr-4">Company</th>
              <th className="py-1.5 pr-2 text-right font-medium sm:pr-4">Price</th>
              <th className="py-1.5 pr-2 text-right font-medium sm:pr-4">Change</th>
              {/* Raw share volume is hidden below sm — Value (₱) already tells
                  the "most active" story in a currency figure a phone reader
                  can compare at a glance, without also needing the share count. */}
              <th className="hidden py-1.5 pr-4 text-right font-medium sm:table-cell">Volume</th>
              <th className="py-1.5 pr-2 text-right font-medium sm:pr-4">Value (₱)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-panel-border">
            {rows.map((row) => (
              <tr key={row.ticker} className="transition-colors hover:bg-panel-raised">
                <td className="py-2 pl-2 tabular-nums text-panel-fg/68 sm:py-2.5 sm:pl-3">{row.rank}</td>
                <td className="py-2">
                  <WatchlistStarButton ticker={row.ticker} size={16} />
                </td>
                <td className="max-w-[110px] py-2 pr-2 sm:max-w-none sm:py-2.5 sm:pr-4">
                  <Link
                    href={`/stocks/${row.ticker}`}
                    className="flex items-center gap-1.5 text-panel-fg hover:underline"
                  >
                    <span className="shrink-0 font-mono text-[10px] font-semibold sm:text-xs">{row.ticker}</span>
                    <span className="min-w-0 flex-1 truncate text-panel-fg/70">{row.companyName}</span>
                  </Link>
                </td>
                <td className="py-2 pr-2 text-right tabular-nums text-panel-fg sm:py-2.5 sm:pr-4">
                  {row.price == null ? <span className="text-panel-fg/65">N/A</span> : `₱${row.price.toFixed(2)}`}
                </td>
                <td className="py-2 pr-2 text-right font-medium tabular-nums sm:py-2.5 sm:pr-4">
                  <span className={changeColor(row.pctChange ?? 0)}>
                    {(row.pctChange ?? 0) >= 0 ? "+" : ""}
                    {(row.pctChange ?? 0).toFixed(2)}%
                  </span>
                </td>
                <td className="hidden py-2.5 pr-4 text-right tabular-nums text-panel-fg sm:table-cell">
                  {formatShares(row.volume)}
                </td>
                <td className="py-2 pr-2 text-right tabular-nums text-panel-fg sm:py-2.5 sm:pr-4">
                  {formatPeso(row.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
