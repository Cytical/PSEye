import { InfoTip } from "./InfoTip";

/**
 * Borderless label/value pair — the metric-tile replacement used across the
 * stock page's hero strip, Analytics, and Statistics panels. Previously every
 * single metric got its own `rounded-xl ring-1` box, which read as a wall of
 * identical cards; grouping several `Kpi`s inside one bordered panel (via
 * `flex flex-wrap gap-x-6 gap-y-3`) keeps the same numbers dense without the
 * repetition.
 */
export function Kpi({
  label,
  value,
  tone,
  hint,
  info,
}: {
  label: string;
  value: string;
  tone?: "up" | "down";
  hint?: string;
  info?: string;
}) {
  const toneClass = tone === "up" ? "text-up" : tone === "down" ? "text-down" : "text-panel-fg";
  return (
    <div className="min-w-[92px]">
      <div className="flex items-center whitespace-nowrap text-[10.5px] text-panel-fg/60">
        {label}
        {info && <InfoTip text={info} />}
      </div>
      <div className={`mt-0.5 text-base font-semibold tabular-nums ${toneClass}`}>{value}</div>
      {hint && <div className="mt-0.5 text-[10px] text-panel-fg/55">{hint}</div>}
    </div>
  );
}
