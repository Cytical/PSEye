import type { PhComparisonResult, PhComparisonStatus } from "@/lib/phDataComparison";

const STATUS_LABEL: Record<PhComparisonStatus, string> = {
  match: "match",
  "na-mismatch": "N/A mismatch",
  "pct-na-mismatch": "% N/A mismatch",
  "price-drift": "price drift",
  "pct-drift": "% drift",
};

const STATUS_CLASS: Record<PhComparisonStatus, string> = {
  match: "text-black/60 dark:text-white/60",
  "na-mismatch": "text-red-700 dark:text-red-400 font-medium",
  "pct-na-mismatch": "text-red-700 dark:text-red-400 font-medium",
  "price-drift": "text-amber-700 dark:text-amber-400",
  "pct-drift": "text-amber-700 dark:text-amber-400",
};

function fmt(n: number | null): string {
  return n === null ? "N/A" : n.toFixed(2);
}

export function PhComparisonTable({ result }: { result: PhComparisonResult }) {
  const total = result.rows.length;

  return (
    <div>
      <dl className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
        <Stat label="Tickers checked" value={total} />
        <Stat label="Match" value={result.matchCount} className="text-green-700 dark:text-green-400" />
        <Stat
          label="N/A mismatch"
          value={result.naMismatchCount}
          className={result.naMismatchCount > 0 ? "text-red-700 dark:text-red-400" : undefined}
        />
        <Stat
          label="% N/A mismatch"
          value={result.pctNaMismatchCount}
          className={result.pctNaMismatchCount > 0 ? "text-red-700 dark:text-red-400" : undefined}
        />
        <Stat label="Drift (expected)" value={result.driftCount} />
      </dl>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-black/10 text-left text-xs uppercase tracking-wide text-black/50 dark:border-white/10 dark:text-white/50">
              <th className="py-1.5 pr-3">Ticker</th>
              <th className="py-1.5 pr-3">DB price</th>
              <th className="py-1.5 pr-3">Live price</th>
              <th className="py-1.5 pr-3">DB %chg</th>
              <th className="py-1.5 pr-3">Live %chg</th>
              <th className="py-1.5">Status</th>
            </tr>
          </thead>
          <tbody>
            {result.rows.map((row) => (
              <tr key={row.ticker} className="border-b border-black/5 dark:border-white/5">
                <td className="py-1.5 pr-3 font-mono">{row.ticker}</td>
                <td className="py-1.5 pr-3 font-mono">{fmt(row.dbPrice)}</td>
                <td className="py-1.5 pr-3 font-mono">{fmt(row.livePrice)}</td>
                <td className="py-1.5 pr-3 font-mono">{fmt(row.dbPctChange)}</td>
                <td className="py-1.5 pr-3 font-mono">{fmt(row.livePctChange)}</td>
                <td className={`py-1.5 ${STATUS_CLASS[row.status]}`}>{STATUS_LABEL[row.status]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, className }: { label: string; value: number; className?: string }) {
  return (
    <div>
      <dt className="text-xs text-black/50 dark:text-white/50">{label}</dt>
      <dd className={`text-lg font-semibold ${className ?? ""}`}>{value}</dd>
    </div>
  );
}
