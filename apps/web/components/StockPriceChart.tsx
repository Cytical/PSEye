import type { HistoricalClose } from "@pseye/source-quotes";

const WIDTH = 640;
const HEIGHT = 200;
const PAD_LEFT = 56;
const PAD_RIGHT = 8;
const PAD_TOP = 12;
const PAD_BOTTOM = 12;

/**
 * Static server-rendered price line (no "use client", no hover/tooltip) —
 * this is content for a mostly-SEO-driven page, not an interactive tool like
 * DcaChart, so it ships zero extra client JS. Only ever called with real
 * DB-backed closes (see apps/web/app/stocks/[ticker]/page.tsx), never
 * MockHistoricalQuoteSource's synthetic walk — showing a fake chart on a
 * page framed as a real company's real data would undermine the one thing
 * this page is for.
 */
export function StockPriceChart({ closes }: { closes: HistoricalClose[] }) {
  if (closes.length < 2) return null;

  const values = closes.map((c) => c.close);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const plotWidth = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotHeight = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const xFor = (i: number) => PAD_LEFT + (i / (closes.length - 1)) * plotWidth;
  const yFor = (v: number) => PAD_TOP + plotHeight - ((v - min) / range) * plotHeight;

  const path = closes.map((c, i) => `${i === 0 ? "M" : "L"}${xFor(i)},${yFor(c.close)}`).join(" ");
  const trendsUp = values[values.length - 1] >= values[0];
  const stroke = trendsUp ? "#0ca30c" : "#d03b3b";

  const yTicks = [min, (min + max) / 2, max];

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full"
      role="img"
      aria-label={`Closing price trend from ${closes[0].date} to ${closes[closes.length - 1].date}`}
    >
      {yTicks.map((t) => (
        <g key={t}>
          <line
            x1={PAD_LEFT}
            x2={WIDTH - PAD_RIGHT}
            y1={yFor(t)}
            y2={yFor(t)}
            className="stroke-panel-fg/10"
            strokeWidth={1}
          />
          <text
            x={PAD_LEFT - 8}
            y={yFor(t)}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize={10}
            className="fill-panel-fg/40"
          >
            {t.toFixed(2)}
          </text>
        </g>
      ))}
      <path d={path} fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
