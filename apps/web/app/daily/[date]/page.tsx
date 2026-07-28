import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDailyRecap, getRecentRecapDates } from "@/lib/dailyRecap";
import { DailyRecapView, formatLongDate } from "@/components/DailyRecapView";

export const revalidate = 3600; // late disclosures/news can still land on "today's" page

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }): Promise<Metadata> {
  const { date } = await params;
  if (!DATE_RE.test(date)) return {};
  const title = `PSE Daily Recap — ${formatLongDate(date)}`;
  return {
    title,
    description: `What happened on the Philippine Stock Exchange on ${formatLongDate(date)}: PSEi close, top movers, foreign flow, block sales, and disclosures.`,
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
