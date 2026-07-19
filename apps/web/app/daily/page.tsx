import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getRecentRecapDates } from "@/lib/dailyRecap";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Daily Recap",
  description: "One page per PSE trading day: index move, top movers, foreign flow, block sales, and disclosures.",
  alternates: { canonical: "/daily" },
};

export default async function DailyIndexPage() {
  const dates = await getRecentRecapDates(1);
  if (dates.length > 0) redirect(`/daily/${dates[0]}`);

  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight text-panel-fg">Daily Recap</h1>
      <p className="mt-3 text-sm text-panel-fg/60">
        No trading days are on record yet — recaps are generated from real recorded market data, so
        they&apos;ll start appearing once the data pipeline has captured its first session.
      </p>
    </div>
  );
}
