import type { SectorCorrelation } from "@/lib/marketAnalytics";

/**
 * Static server-rendered sector × sector correlation matrix (zero client JS).
 * Cell shade encodes correlation magnitude; the number is always printed so
 * color is a secondary cue, not the only one (colorblind-safe). We deliberately
 * avoid the site's up/down green/red here — this isn't a gain/loss figure, so
 * a positive correlation shades toward the neutral --accent and the rare
 * negative one toward muted ink, keeping "red" from reading as "bad".
 *
 * color-mix lets the shade track the active theme's --accent/--panel-fg instead
 * of a baked-in hex, so it reads correctly in both light and dark mode.
 */
export function SectorCorrelationHeatmap({ data }: { data: SectorCorrelation }) {
  const { sectors, matrix } = data;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-1 text-xs">
        <thead>
          <tr>
            <th className="p-1" />
            {sectors.map((s) => (
              <th
                key={s}
                className="p-1 text-center align-bottom font-medium text-panel-fg/72"
                title={s}
              >
                <span className="inline-block max-w-[4.5rem] leading-tight">{shortSector(s)}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sectors.map((rowSec, i) => (
            <tr key={rowSec}>
              <th
                scope="row"
                className="whitespace-nowrap p-1 text-right font-medium text-panel-fg/72"
                title={rowSec}
              >
                {shortSector(rowSec)}
              </th>
              {matrix[i].map((c, j) => (
                <td
                  key={sectors[j]}
                  className="rounded-md p-1.5 text-center tabular-nums text-panel-fg"
                  style={{ backgroundColor: cellColor(c) }}
                  title={`${rowSec} × ${sectors[j]}: ${c == null ? "n/a" : c.toFixed(2)}`}
                >
                  {c == null ? "—" : c.toFixed(2)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** PSE sector names are long; the header/row labels need a compact form. */
function shortSector(sector: string): string {
  const map: Record<string, string> = {
    "Financials": "Financials",
    "Industrial": "Industrial",
    "Holding Firms": "Holding",
    "Property": "Property",
    "Services": "Services",
    "Mining & Oil": "Mining/Oil",
    "SME Board": "SME",
    "Exchange Traded Funds": "ETF",
  };
  return map[sector] ?? sector;
}

/** Correlation → theme-aware background. Positive shades toward --accent, negative toward muted ink. */
function cellColor(c: number | null): string {
  if (c == null) return "transparent";
  if (c >= 0) {
    const pct = Math.round((0.08 + c * 0.55) * 100); // ~8%..63% accent tint
    return `color-mix(in srgb, var(--accent) ${pct}%, transparent)`;
  }
  const pct = Math.round(Math.min(0.35, Math.abs(c) * 0.5) * 100);
  return `color-mix(in srgb, var(--panel-fg) ${pct}%, transparent)`;
}
