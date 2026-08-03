import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDailyRecap, getRecentRecapDates } from "@/lib/dailyRecap";
import { DailyRecapView, formatLongDate } from "@/components/DailyRecapView";

// 2026-08-03: switched off ISR entirely (was revalidate = 3600, briefly 21600,
// with generateStaticParams prerendering the last 14 dates since 2026-08-01).
// See /stocks/[ticker]'s page for the full rationale (same fix, same cause):
// the dynamicParams long tail of recap dates at a 1h/6h window was a meaningful
// chunk of that day's ISR Writes quota exhaustion. force-dynamic renders fresh
// on every request instead of writing a page-level cache entry, so this route
// contributes zero ISR Writes now — getDailyRecap/getRecentRecapDates' underlying
// DB reads stay cheap independently via lib/*.ts's own unstable_cache layer.
export const dynamic = "force-dynamic";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }): Promise<Metadata> {
  const { date } = await params;
  if (!DATE_RE.test(date)) return {};
  const title = `PSE Daily Recap: ${formatLongDate(date)}`;
  return {
    title,
    description: `PSE recap for ${formatLongDate(date)}: PSEi close, top movers, foreign flow, block sales, disclosures.`,
    alternates: { canonical: `/daily/${date}` },
    openGraph: { title },
  };
}

export default async function DailyRecapPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!DATE_RE.test(date)) notFound();

  const [recap, availableDates] = await Promise.all([getDailyRecap(date), getRecentRecapDates(400)]);
  if (!recap) notFound();

  return <DailyRecapView recap={recap} availableDates={availableDates} />;
}
