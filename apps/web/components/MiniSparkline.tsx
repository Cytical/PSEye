/**
 * Tiny inline trend line for the price hero card — a cheap visual anchor so
 * the hero isn't just a number, without pulling in the full interactive
 * StockPriceChart (this renders server-side, no client JS, no axes/tooltips).
 */
export function MiniSparkline({
  values,
  className,
}: {
  values: number[];
  className?: string;
}) {
  if (values.length < 2) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const w = 100;
  const h = 32;

  const points = values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * w;
      const y = h - ((v - min) / range) * h;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");

  const up = values[values.length - 1] >= values[0];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className={className} aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={up ? "var(--up)" : "var(--down)"}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
