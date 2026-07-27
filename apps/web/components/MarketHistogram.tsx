import type { HistogramBin } from "@/lib/analytics";

const WIDTH = 640;
const HEIGHT = 180;
const PAD_X = 8;
const PAD_TOP = 10;
const PAD_BOTTOM = 26;

/**
 * Generic static (zero-client-JS) histogram for a cross-sectional distribution
 * — today's % changes, 1-year returns, volatility, or beta across the market.
 *
 * `colorSplit` (when set) tints bars below it with --down and at/above with
 * --up — used for return distributions centered on 0. Without it, bars use a
 * single --accent tint (volatility/beta, where "negative" isn't "bad").
 * `refValue` draws a labeled reference line (e.g. the median, or beta=1).
 */
export function MarketHistogram({
  bins,
  formatX,
  colorSplit,
  refValue,
  refLabel,
}: {
  bins: HistogramBin[];
  formatX: (x: number) => string;
  colorSplit?: number;
  refValue?: number;
  refLabel?: string;
}) {
  if (bins.length === 0) return null;
  const maxCount = Math.max(...bins.map((b) => b.count));
  if (maxCount === 0) return null;

  const min = bins[0].x0;
  const max = bins[bins.length - 1].x1;
  const span = max - min || 1;

  const plotWidth = WIDTH - PAD_X * 2;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const xFor = (v: number) => PAD_X + ((v - min) / span) * plotWidth;
  const yFor = (count: number) => PAD_TOP + plotHeight - (count / maxCount) * plotHeight;

  const ticks = [min, min + span * 0.25, min + span * 0.5, min + span * 0.75, max];
  const showRef = refValue != null && refValue >= min && refValue <= max;

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Distribution across the market">
      {bins.map((b, i) => {
        const x = xFor(b.x0);
        const w = Math.max(1, xFor(b.x1) - xFor(b.x0) - 1);
        const y = yFor(b.count);
        const h = PAD_TOP + plotHeight - y;
        const center = (b.x0 + b.x1) / 2;
        const fill =
          colorSplit != null ? (center < colorSplit ? "var(--down)" : "var(--up)") : "var(--accent)";
        return <rect key={i} x={x} y={y} width={w} height={h} fill={fill} opacity={0.8} />;
      })}

      {showRef && (
        <g>
          <line
            x1={xFor(refValue!)}
            x2={xFor(refValue!)}
            y1={PAD_TOP - 2}
            y2={PAD_TOP + plotHeight}
            className="stroke-panel-fg/55"
            strokeWidth={1.5}
            strokeDasharray="3 3"
          />
          {refLabel && (
            <text
              x={xFor(refValue!)}
              y={PAD_TOP + 6}
              textAnchor={xFor(refValue!) > WIDTH / 2 ? "end" : "start"}
              dx={xFor(refValue!) > WIDTH / 2 ? -4 : 4}
              fontSize={10}
              className="fill-panel-fg/72"
            >
              {refLabel}
            </text>
          )}
        </g>
      )}

      {ticks.map((t, i) => (
        <text
          key={i}
          x={xFor(t)}
          y={HEIGHT - 8}
          // The first/last tick sit at the plot's very edge — center-anchoring
          // them (like the interior ticks) would run half the label off the
          // edge of the viewBox and get clipped by the container's overflow.
          textAnchor={i === 0 ? "start" : i === ticks.length - 1 ? "end" : "middle"}
          fontSize={10}
          className="fill-panel-fg/65"
        >
          {formatX(t)}
        </text>
      ))}
    </svg>
  );
}
