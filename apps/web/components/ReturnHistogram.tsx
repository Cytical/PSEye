import { histogram } from "@/lib/analytics";

const PAD_LEFT = 8;
const PAD_RIGHT = 8;
const PAD_TOP = 10;

/**
 * Static server-rendered histogram of daily returns (zero client JS, same
 * rationale as StockPriceChart/StockAnalytics). Bars left of 0 use --down, bars
 * at/above 0 use --up, so the shape of the return distribution — its spread,
 * skew, and fat tails — reads at a glance. `returns` are simple daily returns
 * (e.g. 0.012 = +1.2%).
 *
 * The viewBox is a prop, not a constant, because this renders at two very
 * different widths: full-panel-wide on the analytics route, and ~230px in the
 * stock dashboard's statistics panel. An SVG scales its text with the viewBox,
 * so a fixed 640-wide box squeezed into 230px would render its 10px axis
 * labels at ~3.6px. Passing a narrower box (and a proportionally larger
 * `fontSize`) keeps the labels legible at the size they're actually displayed.
 */
export function ReturnHistogram({
  returns,
  width = 640,
  height = 200,
  fontSize = 10,
  tickCount = 5,
  binCount = 31,
}: {
  returns: number[];
  width?: number;
  height?: number;
  fontSize?: number;
  /** 5 ticks fit a wide box; a narrow one only has room for 3. */
  tickCount?: 3 | 5;
  binCount?: number;
}) {
  if (returns.length < 20) return null;

  const WIDTH = width;
  const HEIGHT = height;
  const PAD_BOTTOM = fontSize * 2.6;

  const bins = histogram(returns, binCount);
  const maxCount = Math.max(...bins.map((b) => b.count));
  if (maxCount === 0) return null;

  const min = bins[0].x0;
  const max = bins[bins.length - 1].x1;
  const span = max - min || 1;

  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const xFor = (v: number) => PAD_LEFT + ((v - min) / span) * plotWidth;
  const yFor = (count: number) => PAD_TOP + plotHeight - (count / maxCount) * plotHeight;
  const zeroX = xFor(0);

  // A few axis ticks in percent, including 0.
  const ticks = (tickCount === 3 ? [min, 0, max] : [min, min + span * 0.25, 0, min + span * 0.75, max])
    .filter((t, i, arr) => arr.indexOf(t) === i && t >= min && t <= max)
    .sort((a, b) => a - b);

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full"
      role="img"
      aria-label="Distribution of daily returns over the window"
    >
      {/* zero line */}
      <line x1={zeroX} x2={zeroX} y1={PAD_TOP} y2={PAD_TOP + plotHeight} className="stroke-panel-fg/20" strokeWidth={1} />
      {bins.map((b, i) => {
        const x = xFor(b.x0);
        const w = Math.max(1, xFor(b.x1) - xFor(b.x0) - 1);
        const y = yFor(b.count);
        const h = PAD_TOP + plotHeight - y;
        const isDown = (b.x0 + b.x1) / 2 < 0;
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={w}
            height={h}
            fill={isDown ? "var(--down)" : "var(--up)"}
            opacity={0.85}
          />
        );
      })}
      {ticks.map((t, i) => (
        <text
          key={t}
          x={xFor(t)}
          y={HEIGHT - fontSize * 0.8}
          // First/last tick sit at the plot's edge — center-anchoring them
          // (like the interior ticks) would run half the label past the
          // viewBox edge and get clipped by the container's overflow.
          textAnchor={i === 0 ? "start" : i === ticks.length - 1 ? "end" : "middle"}
          fontSize={fontSize}
          className="fill-panel-fg/65"
        >
          {`${t >= 0 ? "+" : ""}${(t * 100).toFixed(1)}%`}
        </text>
      ))}
    </svg>
  );
}
