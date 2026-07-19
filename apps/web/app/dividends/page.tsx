import type { Metadata } from "next";
import Link from "next/link";
import { getDividendScreener } from "@/lib/dividends";
import { DividendScreenerTable } from "@/components/DividendScreenerTable";

export const revalidate = 3600; // dividends move daily at most, but keep price-based yields fresh-ish

export const metadata: Metadata = {
  title: "Dividend Screener",
  description:
    "PSE dividend yields, ranked — trailing-12-month cash dividends per share, payout counts, and upcoming ex-dates for every tracked company.",
  alternates: { canonical: "/dividends" },
};

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-PH", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function DividendsPage() {
  const { source, coverageStart, rows } = await getDividendScreener();

  // Coverage shorter than ~a year means trailing totals understate real yields — say so.
  const today = new Date();
  const aYearAgo = new Date(today);
  aYearAgo.setUTCDate(aYearAgo.getUTCDate() - 350);
  const partialCoverage =
    source === "real" && (coverageStart === null || coverageStart > aYearAgo.toISOString().slice(0, 10));

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-panel-fg">Dividend Screener</h1>
      <p className="mt-1.5 max-w-3xl text-sm text-panel-fg/60">
        Cash dividends declared on common shares over the trailing 12 months, summed per share and
        divided by the latest price. Sort any column — or check the{" "}
        <Link href="/calendar" className="underline hover:text-panel-fg">
          calendar
        </Link>{" "}
        for the full ex-date schedule. Yields are historical, not a promise of the next payout.
      </p>

      {rows.length > 0 ? (
        <div className="mt-8">
          <DividendScreenerTable rows={rows} />
        </div>
      ) : (
        <p className="mt-8 rounded-lg bg-panel p-6 text-center text-sm text-panel-fg/50 ring-1 ring-panel-border">
          No cash dividends on record yet.
        </p>
      )}

      <div className="mt-6 flex flex-col gap-1.5 text-xs text-panel-fg/60">
        {source === "mock" && (
          <p>
            Sample data — no real dividend declarations are on record yet. Figures here are
            illustrative, not actual payouts.
          </p>
        )}
        {partialCoverage && (
          <p>
            Dividend history is tracked{coverageStart ? ` since ${formatDate(coverageStart)}` : " only recently"} —
            trailing-12-month totals may understate a company&apos;s true payout until a full year of
            history accumulates.
          </p>
        )}
        <p>
          Preferred-share series, USD-denominated, and percent-of-par payouts are excluded — the
          yield is per <em>common</em> share against its peso price.
        </p>
      </div>
    </div>
  );
}
