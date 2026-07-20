import type { Metadata } from "next";
import { getDailyQuotes } from "@/lib/quotes";
import { CompareTool } from "@/components/CompareTool";

export const revalidate = 3600; // hourly; matches the quotes ETL cadence

export const metadata: Metadata = {
  title: "Compare PSE Stocks — Performance Chart",
  description: "Compare normalized % price performance of up to 4 PSE-listed stocks over time.",
  alternates: { canonical: "/compare" },
};

export default async function ComparePage() {
  const quotes = await getDailyQuotes();

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight text-panel-fg">Compare Stocks</h1>
      <p className="mt-1.5 text-sm text-panel-fg/60">
        Normalized % price change since a chosen start date — puts any PSE stocks on the same
        scale regardless of share price, so a ₱2 stock and a ₱1,000 stock are directly
        comparable.
      </p>

      <div className="mt-6">
        <CompareTool quotes={quotes} />
      </div>
    </div>
  );
}
