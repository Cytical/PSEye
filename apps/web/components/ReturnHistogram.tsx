import { histogram } from "@/lib/analytics";

const WIDTH = 640;
const HEIGHT = 200;
const PAD_LEFT = 8;
const PAD_RIGHT = 8;
const PAD_TOP = 10;
const PAD_BOTTOM = 26;

/**
 * Static server-rendered histogram of daily returns (zero client JS, same
 * rationale as StockPriceChart/StockAnalytics). Bars left of 0 use --down, bars
 * at/above 0 use --up, so the shape of the return distribution — its spread,
 * skew, and fat tails — reads at a glance. `returns` are simple daily returns
 * (e.g. 0.012 = +1.2%).
 */
export function ReturnHistogram({ returns }: { returns: number[] }) {
  if (returns.length < 20) return null;

  const bins = histogram(returns, 31);
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
  const ticks = [min, min + span * 0.25, 0, min + span * 0.75, max]
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
      {ticks.map((t) => (
        <text
          key={t}
          x={xFor(t)}
          y={HEIGHT - 8}
          textAnchor="middle"
          fontSize={10}
          className="fill-panel-fg/45"
        >
          {`${t >= 0 ? "+" : ""}${(t * 100).toFixed(1)}%`}
        </text>
      ))}
    </svg>
  );
}
