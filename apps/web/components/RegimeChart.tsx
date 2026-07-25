import type { RegimePoint, Regime } from "@/lib/marketRegime";

const WIDTH = 900;
const HEIGHT = 320;
const PAD_LEFT = 52;
const PAD_RIGHT = 12;
const PAD_TOP = 14;
const PAD_BOTTOM = 30;

/** Theme-aware background tint for a regime band. */
export function regimeBandColor(regime: Regime): string {
  switch (regime) {
    case "risk-on":
      return "color-mix(in srgb, var(--up) 15%, transparent)";
    case "risk-off":
      return "color-mix(in srgb, var(--down) 17%, transparent)";
    default:
      return "color-mix(in srgb, var(--panel-fg) 7%, transparent)";
  }
}

/**
 * Static (zero-client-JS) composite-index line with the background shaded by
 * detected regime — the clearest way to see the risk-on/off history line up
 * with what the index actually did. Points are chronological.
 */
export function RegimeChart({ points }: { points: RegimePoint[] }) {
  if (points.length < 3) return null;

  const n = points.length;
  const levels = points.map((p) => p.level);
  const min = Math.min(...levels);
  const max = Math.max(...levels);
  const range = max - min || 1;

  const plotW = WIDTH - PAD_LEFT - PAD_RIGHT;
  const plotH = HEIGHT - PAD_TOP - PAD_BOTTOM;
  const xFor = (i: number) => PAD_LEFT + (i / (n - 1)) * plotW;
  const yFor = (v: number) => PAD_TOP + plotH - ((v - min) / range) * plotH;

  // Group consecutive same-regime points into background bands that tile edge-to-edge.
  const bands: { start: number; end: number; regime: Regime }[] = [];
  for (let i = 0; i < n; i++) {
    const last = bands[bands.length - 1];
    if (last && last.regime === points[i].regime) last.end = i;
    else bands.push({ start: i, end: i, regime: points[i].regime });
  }
  const bandX = (i: number, edge: "l" | "r") => {
    if (edge === "l") return i === 0 ? PAD_LEFT : (xFor(i - 1) + xFor(i)) / 2;
    return i === n - 1 ? WIDTH - PAD_RIGHT : (xFor(i) + xFor(i + 1)) / 2;
  };

  const path = points.map((p, i) => `${i === 0 ? "M" : "L"}${xFor(i).toFixed(1)},${yFor(p.level).toFixed(1)}`).join(" ");

  const yTicks = [min, min + range / 2, max];
  const xTickIdx = [0, Math.floor(n / 4), Math.floor(n / 2), Math.floor((3 * n) / 4), n - 1];

  return (
    <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Composite index with market regime shading">
      {bands.map((b, i) => (
        <rect
          key={i}
          x={bandX(b.start, "l")}
          y={PAD_TOP}
          width={Math.max(0, bandX(b.end, "r") - bandX(b.start, "l"))}
          height={plotH}
          fill={regimeBandColor(b.regime)}
        />
      ))}

      {yTicks.map((t) => (
        <g key={t}>
          <line x1={PAD_LEFT} x2={WIDTH - PAD_RIGHT} y1={yFor(t)} y2={yFor(t)} className="stroke-panel-fg/10" strokeWidth={1} />
          <text x={PAD_LEFT - 6} y={yFor(t)} textAnchor="end" dominantBaseline="middle" fontSize={10} className="fill-panel-fg/45">
            {t.toFixed(0)}
          </text>
        </g>
      ))}

      {xTickIdx.map((i) => (
        <text key={i} x={xFor(i)} y={HEIGHT - 10} textAnchor="middle" fontSize={10} className="fill-panel-fg/45">
          {points[i].date.slice(0, 7)}
        </text>
      ))}

      <path d={path} fill="none" stroke="var(--panel-fg)" strokeOpacity={0.8} strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}
