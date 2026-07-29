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
