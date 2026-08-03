import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDailyRecap, getRecentRecapDates } from "@/lib/dailyRecap";
import { DailyRecapView, formatLongDate } from "@/components/DailyRecapView";

export const revalidate = 21600; // 6h safety-net ceiling, matching the rest of the site (was 3600 for late-landing disclosures/news, but the dynamicParams long tail of recap dates at 1h was a meaningful chunk of the 2026-08-03 ISR Writes quota exhaustion)

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Prerenders the recent recap dates at build time instead of leaving the whole
 * route `ƒ Dynamic`, which is what it was: every visit — including the
 * overwhelmingly common "today" and "yesterday" — paid a cold DB round trip
 * before anything rendered. These are the only dates with meaningful traffic
 * (the homepage's mobile summary and the daily X post both link to the latest
 * one).
 *
 * 2026-08-01: trimmed from 60 to 14. Every path returned here gets rewritten
 * into the ISR cache on every single deploy regardless of traffic, and this
 * project deploys many times a day (direct pushes to master) — 60 stale-dated
 * pages nobody revisits was a real contributor to Vercel's ISR Writes climbing
 * to 75% of the free-tier quota (see /stocks/[ticker]'s PSEi30 trim, same
 * cause). Two weeks covers everything actually linked to.
 *
 * Deliberately NOT the full `getRecentRecapDates(400)` the date picker offers:
 * this route stays dynamic-capable, so an older date is still served on demand
 * and cached from then on — the same shape as `/stocks/[ticker]`, just with a
 * rolling window rather than a fixed roster.
 */
export async function generateStaticParams() {
  const dates = await getRecentRecapDates(14);
  return dates.map((date) => ({ date }));
}

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
