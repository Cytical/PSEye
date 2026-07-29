import type { HistoricalClose } from "@pseye/source-quotes";

const WIDTH = 660;
const HEIGHT = 250;
const PAD_LEFT = 46;
const PAD_RIGHT = 12;
const PAD_TOP = 12;
const PAD_BOTTOM = 22;

/**
 * Static server-rendered price line (no "use client", no hover/tooltip) —
 * this is content for a mostly-SEO-driven page, not an interactive tool like
 * DcaChart, so it ships zero extra client JS. Only ever called with real
 * DB-backed closes (see apps/web/app/stocks/[ticker]/page.tsx), never
 * MockHistoricalQuoteSource's synthetic walk — showing a fake chart on a
 * page framed as a real company's real data would undermine the one thing
 * this page is for.
 *
 * The gradient area, dated x-axis, and end-of-series marker exist because this
 * is the stock dashboard's single largest panel: a bare stroke on an empty
 * field read as a placeholder at that size.
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
  const stroke = trendsUp ? "var(--up)" : "var(--down)";
  // Closing the line path down to the baseline turns it into the fill region;
  // a separate <path> keeps the stroke itself from tracing the baseline.
  const area = `${path} L${xFor(closes.length - 1)},${PAD_TOP + plotHeight} L${PAD_LEFT},${PAD_TOP + plotHeight} Z`;
  // Unique per trend direction so the light/dark up-and-down variants can't
  // collide when two of these ever render on one page.
  const gradientId = `spc-fill-${trendsUp ? "up" : "down"}`;

  const yTicks = [min, min + range * 0.5, max];
  // First/middle/last only: a 90-point series has no room for more without the
  // labels colliding at this width.
  const xTickIdx = [0, Math.floor((closes.length - 1) / 2), closes.length - 1];

  const lastX = xFor(closes.length - 1);
  const lastY = yFor(values[values.length - 1]);

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      // `h-full` only from lg, where the dashboard row gives the panel a
      // definite height for it to resolve against. On mobile the row height
      // is dropped, so a percentage height would have no basis — width plus
      // the viewBox's own aspect ratio sizes it correctly there instead.
      className="w-full lg:h-full"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={`Closing price trend from ${closes[0].date} to ${closes[closes.length - 1].date}`}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity={0.22} />
          <stop offset="100%" stopColor={stroke} stopOpacity={0} />
        </linearGradient>
      </defs>

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
            className="fill-panel-fg/65"
          >
            {t.toFixed(2)}
          </text>
        </g>
      ))}

      <path d={area} fill={`url(#${gradientId})`} />
      <path d={path} fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={lastX} cy={lastY} r={3.5} fill={stroke} />

      {xTickIdx.map((idx, i) => (
        <text
          key={idx}
          x={xFor(idx)}
          y={HEIGHT - 6}
          textAnchor={i === 0 ? "start" : i === xTickIdx.length - 1 ? "end" : "middle"}
          fontSize={10}
          className="fill-panel-fg/65"
        >
          {shortDate(closes[idx].date)}
        </text>
      ))}
    </svg>
  );
}

function shortDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}
