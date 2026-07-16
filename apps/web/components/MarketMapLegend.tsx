import { LEGEND_GRADIENT_CSS, LEGEND_TICKS, NO_DATA_COLOR } from "@pseye/treemap-layout";

export function MarketMapLegend() {
  return (
    <div className="flex w-64 shrink-0 flex-col items-center gap-1.5">
      <span className="text-[10px] font-medium uppercase tracking-wide text-black/40 dark:text-white/40">
        Day change
      </span>
      <div className="w-full">
        <div
          className="h-2.5 w-full rounded-full ring-1 ring-inset ring-black/10 dark:ring-white/10"
          style={{ background: LEGEND_GRADIENT_CSS }}
        />
        <div className="flex w-full justify-between text-[10px] font-medium text-black/60 dark:text-white/60">
          {LEGEND_TICKS.map((tick) => (
            <span key={tick}>
              {tick > 0 ? "+" : ""}
              {tick}%
            </span>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-[10px] font-medium text-black/40 dark:text-white/40">
        <span
          className="h-2.5 w-2.5 rounded-sm ring-1 ring-inset ring-black/10 dark:ring-white/10"
          style={{ background: NO_DATA_COLOR }}
        />
        No trade today
      </div>
    </div>
  );
}
