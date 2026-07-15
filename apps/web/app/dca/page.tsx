import { getDailyQuotes } from "@/lib/quotes";
import { DcaCalculator } from "@/components/DcaCalculator";

export const revalidate = 86400;

export default async function DcaPage() {
  const quotes = await getDailyQuotes();

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-xl font-semibold">DCA Calculator</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        See what cost-averaging a fixed amount into a stock (or the market as a whole) would
        have grown to. Not financial advice — past patterns don&apos;t predict future returns.
      </p>

      <div className="mt-6">
        <DcaCalculator quotes={quotes} />
      </div>

      <p className="mt-6 text-xs text-black/40 dark:text-white/40">
        Price history is sample data — a real EOD price history feed has not been wired in yet
        (see project plan, Open Question #1). Results are illustrative, not historical fact.
      </p>
    </div>
  );
}
