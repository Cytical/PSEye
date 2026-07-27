/** Categorical cluster palette — fixed hues legible on both light and dark themes (not the up/down finance colors). */
export const CLUSTER_COLORS = ["#4f83cc", "#e2803c", "#2f9e6f", "#b5599b", "#c6a015", "#7d6bd6"];

const WIDTH = 640;
const HEIGHT = 380;
const PAD_LEFT = 48;
const PAD_RIGHT = 14;
const PAD_TOP = 14;
const PAD_BOTTOM = 40;

export interface ScatterPoint {
  ticker: string;
  x: number; // beta
  y: number; // volatility (%)
  marketCap: number;
  clusterId: number;
}

/**
 * Static (zero-client-JS) scatter of the clustered stocks on the beta ×
 * volatility risk plane, colored by cluster and sized by market cap. The single
 * clearest way to see that the clusters are real structure, not arbitrary
 * buckets. Hover a point for its ticker.
 */
export function ClusterScatter({ points }: { points: ScatterPoint[] }) {
  if (points.length < 2) return null;

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  const yMin = Math.min(...ys);
  const yMax = Math.max(...ys);
  const xPad = (xMax - xMin) * 0.08 || 0.1;
  const yPad = (yMax - yMin) * 0.08 || 1;
  const x0 = xMin - xPad;
  const x1 = xMax + xPad;
  const y0 = Math.max(0, yMin - yPad);
  const y1 = yMax + yPad;

  const plotW = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const sx = (v: number) => PAD_LEFT + ((v - x0) / (x1 - x0)) * plotW;
  const sy = (v: number) => PAD_TOP + plotH - ((v - y0) / (y1 - y0)) * plotH;

  const maxCap = Math.max(...points.map((p) => p.marketCap));
  const rFor = (cap: number) => 3 + Math.sqrt(cap / maxCap) * 7;

  const xTicks = niceTicks(x0, x1, 5);
  const yTicks = niceTicks(y0, y1, 5);

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Stocks plotted by beta and volatility, colored by cluster">
      {/* gridlines + axis labels */}
      {yTicks.map((t) => (
        <g key={`y${t}`}>
          <line x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT} y1={sy(t)} y2={sy(t)} className="stroke-panel-fg/10" strokeWidth={1} />
          <text x={PAD_LEFT - 6} y={sy(t)} textAnchor="end" dominantBaseline="middle" fontSize={10} className="fill-panel-fg/65">
            {t.toFixed(0)}%
          </text>
        </g>
      ))}
      {xTicks.map((t) => (
        <text key={`x${t}`} x={sx(t)} y={HEIGHT - PAD_BOTTOM + 16} textAnchor="middle" fontSize={10} className="fill-panel-fg/65">
          {t.toFixed(1)}
        </text>
      ))}

      {/* beta = 1 reference */}
      {1 >= x0 && 1 <= x1 && (
        <line x1={sx(1)} x2={sx(1)} y1={PAD_TOP} y2={PAD_TOP + plotH} className="stroke-panel-fg/25" strokeWidth={1} strokeDasharray="3 3" />
      )}

      {points.map((p) => (
        <circle key={p.ticker} cx={sx(p.x)} cy={sy(p.y)} r={rFor(p.marketCap)} fill={CLUSTER_COLORS[p.clusterId % CLUSTER_COLORS.length]} fillOpacity={0.72} stroke="var(--panel-bg)" strokeWidth={0.75}>
          <title>{`${p.ticker} · β ${p.x.toFixed(2)} · vol ${p.y.toFixed(0)}%`}</title>
        </circle>
      ))}

      <text x={PAD_LEFT + plotW / 2} y={HEIGHT - 6} textAnchor="middle" fontSize={11} className="fill-panel-fg/72">
        Beta (vs market) →
      </text>
      <text x={12} y={PAD_TOP + plotH / 2} textAnchor="middle" fontSize={11} className="fill-panel-fg/72" transform={`rotate(-90 12 ${PAD_TOP + plotH / 2})`}>
        Annualized volatility →
      </text>
    </svg>
  );
}

/** A handful of round-ish tick values spanning [lo, hi]. */
function niceTicks(lo: number, hi: number, count: number): number[] {
  const span = hi - lo || 1;
  const raw = span / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const norm = raw / mag;
  const step = (norm >= 5 ? 5 : norm >= 2 ? 2 : 1) * mag;
  const start = Math.ceil(lo / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= hi + 1e-9; v += step) ticks.push(Number(v.toFixed(6)));
  return ticks;
}
