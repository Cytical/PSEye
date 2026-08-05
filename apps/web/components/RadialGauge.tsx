/**
 * Small ring gauge for a 0–100 reading (RSI) — one deliberately different
 * widget shape among the page's otherwise text-and-number tiles.
 */
export function RadialGauge({
  value,
  size = 52,
  tone,
}: {
  value: number;
  size?: number;
  tone?: "up" | "down";
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const strokeWidth = 5;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const color = tone === "up" ? "var(--up)" : tone === "down" ? "var(--down)" : "var(--accent)";

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="var(--panel-border)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        // Sweeps from empty (--gauge-from, the full circumference) to the
        // `strokeDashoffset` above on mount — see the gauge-fill keyframe in
        // globals.css for why there's no matching --gauge-to.
        style={{ "--gauge-from": circumference, animation: "gauge-fill 600ms ease-out" } as React.CSSProperties}
      />
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-current text-[13px] font-semibold text-panel-fg"
      >
        {Math.round(clamped)}
      </text>
    </svg>
  );
}

/**
 * Compact MACD histogram — a small red/green bar chart of the trailing
 * histogram bars around a zero baseline. Deliberately a different visual
 * shape from `RadialGauge` (a bounded 0–100 ring doesn't fit MACD, which is
 * unbounded and sign-based) so the two read as distinct signals sitting side
 * by side, not two dials measuring the same thing.
 */
export function MacdBars({ histogram, size = 52 }: { histogram: number[]; size?: number }) {
  const barW = 3;
  const gap = 1.5;
  const width = Math.max(size, histogram.length * (barW + gap));
  const mid = size / 2;
  const maxAbs = Math.max(...histogram.map((h) => Math.abs(h)), 1e-9);

  return (
    <svg width={width} height={size} viewBox={`0 0 ${width} ${size}`} className="shrink-0">
      <line x1={0} y1={mid} x2={width} y2={mid} stroke="var(--panel-border)" strokeWidth={1} />
      {histogram.map((h, i) => {
        const barH = Math.max((Math.abs(h) / maxAbs) * (mid - 2), 1);
        const x = i * (barW + gap);
        const y = h >= 0 ? mid - barH : mid;
        const isLast = i === histogram.length - 1;
        const color = h >= 0 ? "var(--up)" : "var(--down)";
        return (
          <rect key={i} x={x} y={y} width={barW} height={barH} rx={0.75} fill={color} opacity={isLast ? 1 : 0.55} />
        );
      })}
    </svg>
  );
}
