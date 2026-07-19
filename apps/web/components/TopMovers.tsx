import Link from "next/link";

interface MoverQuote {
  ticker: string;
  pctChange: number | null;
}

interface TopMoversProps {
  quotes: MoverQuote[];
  count?: number;
}

function changeColor(pctChange: number): string {
  return pctChange >= 0 ? "text-[#30cc5a]" : "text-[#f6362f]";
}

/**
 * Top gainers/losers by today's % change — a classic finance-site "give
 * visitors a reason to check back daily" widget (Yahoo/Google Finance both
 * lead with this). Lives in the market map's filter sidebar, below
 * MarketSummaryBar, computed once server-side from the same quotes the
 * treemap already fetched — no extra data source.
 */
export function TopMovers({ quotes, count = 3 }: TopMoversProps) {
  const withChange = quotes.filter((q): q is MoverQuote & { pctChange: number } => q.pctChange !== null);
  const gainers = [...withChange].sort((a, b) => b.pctChange - a.pctChange).slice(0, count);
  const losers = [...withChange].sort((a, b) => a.pctChange - b.pctChange).slice(0, count);

  if (gainers.length === 0) return null;

  return (
    <div className="flex flex-col gap-3 px-3 py-2 text-sm">
      <MoverList label="Top gainers" rows={gainers} />
      <MoverList label="Top losers" rows={losers} />
    </div>
  );
}

function MoverList({ label, rows }: { label: string; rows: (MoverQuote & { pctChange: number })[] }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-panel-fg/60">{label}</div>
      <ul className="mt-1 flex flex-col gap-1">
        {rows.map((q) => (
          <li key={q.ticker}>
            <Link
              href={`/stocks/${q.ticker}`}
              className="flex items-center justify-between gap-2 rounded px-1 py-0.5 hover:bg-panel-raised"
            >
              <span className="font-mono text-xs text-panel-fg">{q.ticker}</span>
              <span className={`text-xs font-semibold tabular-nums ${changeColor(q.pctChange)}`}>
                {q.pctChange >= 0 ? "+" : ""}
                {q.pctChange.toFixed(2)}%
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
