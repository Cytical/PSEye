import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDailyRecap, getRecentRecapDates } from "@/lib/dailyRecap";
import { DailyRecapView, formatLongDate } from "@/components/DailyRecapView";

export const revalidate = 3600; // late disclosures/news can still land on "today's" page

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Prerenders the recent recap dates at build time instead of leaving the whole
 * route `ƒ Dynamic`, which is what it was: every visit — including the
 * overwhelmingly common "today" and "yesterday" — paid a cold DB round trip
 * before anything rendered. These are the only dates with meaningful traffic
 * (the homepage's mobile summary and the daily X post both link to the latest
 * one), and each is a handful of small reads, so 60 of them is cheap.
 *
 * Deliberately NOT the full `getRecentRecapDates(400)` the date picker offers:
 * this route stays dynamic-capable, so an older date is still served on demand
 * and cached from then on — the same shape as `/stocks/[ticker]`, just with a
 * rolling window rather than a fixed roster.
 */
export async function generateStaticParams() {
  const dates = await getRecentRecapDates(60);
  return dates.map((date) => ({ date }));
}

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
