import type { Metadata } from "next";
import { getDailyRecap, getRecentRecapDates } from "@/lib/dailyRecap";
import { DailyRecapView } from "@/components/DailyRecapView";

export const revalidate = 3600;

/** The newest trading day on record, or null without a database / before the
 * pipeline's first session. Both `generateMetadata` and the page itself need it;
 * it's two small indexed reads, and this route is prerendered hourly anyway. */
async function getLatestRecapDate(): Promise<string | null> {
  const [latest] = await getRecentRecapDates(1);
  return latest ?? null;
}

export async function generateMetadata(): Promise<Metadata> {
  const latest = await getLatestRecapDate();
  return {
    title: "PSE Market Recap — PSEi Today's Movers & Flow",
    description:
      "One page per PSE trading day: index move, top movers, foreign flow, block sales, and disclosures.",
    // Points at the dated permalink, not at itself. /daily renders the same
    // recap as /daily/<latest>, so the two URLs are byte-for-byte duplicates on
    // any given day; the dated URL is the stable one (it keeps this content
    // forever, while /daily's shifts every session), so it's the one to
    // consolidate on. Without a database there's no dated URL to point at, so
    // /daily is the canonical by default.
    alternates: { canonical: latest ? `/daily/${latest}` : "/daily" },
  };
}

export default async function DailyIndexPage() {
  const latest = await getLatestRecapDate();

  // Deliberately not a redirect() to /daily/<latest>. This route is prerendered,
  // and Next can't emit an HTTP 3xx from a static render — it compiles
  // redirect() into a <meta http-equiv="refresh"> in the HTML instead, which
  // Search Console reports as a redirect error on a URL that's in the sitemap
  // and in the main nav. Rendering the recap here keeps /daily a genuine 200.
  const [recap, availableDates] = await Promise.all([
    latest ? getDailyRecap(latest) : null,
    getRecentRecapDates(400),
  ]);

  if (!recap) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-panel-fg sm:text-3xl">Daily Recap</h1>
        <p className="mt-3 text-sm text-panel-fg/72">
          No trading days are on record yet — recaps are generated from real recorded market data, so
          they&apos;ll start appearing once the data pipeline has captured its first session.
        </p>
      </div>
    );
  }

  return <DailyRecapView recap={recap} availableDates={availableDates} />;
}
