import { InfoTip } from "./InfoTip";

/**
 * Borderless label/value pair — the metric tile used across the stock
 * dashboard's hero rail, Analytics, and Statistics panels. Every metric having
 * its own `rounded-xl ring-1` box read as a wall of identical cards; grouping
 * plain `Kpi`s inside one `Panel` keeps the numbers dense without the
 * repetition.
 *
 * `min-w-0` (not a min-width floor) because every parent is now a grid that
 * owns column sizing — the label truncates inside its column instead of
 * widening it, which is what keeps the columns aligned down a whole panel.
 */
export function Kpi({
  label,
  value,
  tone,
  hint,
  info,
  size = "sm",
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
  hint?: string;
  info?: string;
  /** `md` for the hero rail's headline figures; `sm` everywhere else. */
  size?: "sm" | "md";
}) {
  const toneClass = tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-panel-fg";
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-0.5 text-[10.5px] leading-tight text-panel-fg/60">
        <span className="truncate" title={label}>
          {label}
        </span>
        {info && <InfoTip text={info} />}
      </div>
      <div
        className={`mt-0.5 font-semibold tabular-nums ${size === "md" ? "text-[15px]" : "text-[13.5px]"} ${toneClass}`}
      >
        {value}
      </div>
      {hint && <div className="truncate text-[10px] leading-tight text-panel-fg/55">{hint}</div>}
    </div>
  );
}
