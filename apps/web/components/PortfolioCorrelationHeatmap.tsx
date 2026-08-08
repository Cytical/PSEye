import type { HoldingsCorrelation } from "@/lib/portfolioRisk";

/**
 * Ticker × ticker correlation matrix for the holdings currently in the
 * portfolio. Same cell-shading convention as SectorCorrelationHeatmap.tsx
 * (positive tints toward --accent, negative toward muted ink, number always
 * printed so color is a secondary cue) — deliberately not that component
 * reused directly, since its axis labels are PSE sector names (with their own
 * shortening table) rather than tickers, which need none.
 */
export function PortfolioCorrelationHeatmap({ data }: { data: HoldingsCorrelation }) {
  const { tickers, matrix } = data;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-1 text-xs">
        <thead>
          <tr>
            <th className="p-1" />
            {tickers.map((t) => (
              <th key={t} className="p-1 text-center align-bottom font-mono font-medium text-panel-fg/72">
                {t}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {tickers.map((rowTicker, i) => (
            <tr key={rowTicker}>
              <th scope="row" className="whitespace-nowrap p-1 text-right font-mono font-medium text-panel-fg/72">
                {rowTicker}
              </th>
              {matrix[i].map((c, j) => (
                <td
                  key={tickers[j]}
                  className="rounded-md p-1.5 text-center tabular-nums text-panel-fg"
                  style={{ backgroundColor: cellColor(c) }}
                  title={`${rowTicker} × ${tickers[j]}: ${c == null ? "n/a" : c.toFixed(2)}`}
                >
                  {c == null ? "N/A" : c.toFixed(2)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** Same ramp as SectorCorrelationHeatmap.tsx's cellColor — see that file for
 * why the positive ramp caps at 52% (label contrast in dark mode). */
function cellColor(c: number | null): string {
  if (c == null) return "transparent";
  if (c >= 0) {
    const pct = Math.round((0.08 + c * 0.44) * 100);
    return `color-mix(in srgb, var(--accent) ${pct}%, transparent)`;
  }
  const pct = Math.round(Math.min(0.35, Math.abs(c) * 0.5) * 100);
  return `color-mix(in srgb, var(--panel-fg) ${pct}%, transparent)`;
}
