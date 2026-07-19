import type { Metadata } from "next";
import { getDailyQuotes } from "@/lib/quotes";
import { getCompanyProfiles } from "@/lib/companyProfiles";
import { getMarketSnapshot } from "@/lib/marketSnapshot";
import { getLatestForeignFlow } from "@/lib/latestForeignFlow";
import { MarketMap } from "@/components/MarketMap";

export const revalidate = 3600; // hourly; matches the intraday ETL cadence

export const metadata: Metadata = {
  title: "Market Map",
  description:
    "PSEi stock treemap — box size is market cap, color is today's % change, grouped by PSE sector.",
  alternates: { canonical: "/" },
};

export default async function MarketMapPage() {
  const [quotes, profileByTicker, snapshot, foreignFlow] = await Promise.all([
    getDailyQuotes(),
    getCompanyProfiles(),
    getMarketSnapshot(),
    getLatestForeignFlow(),
  ]);

  return (
    <div className="mx-auto max-w-[1600px] px-4 py-8">
      <h1 className="text-xl font-semibold">PSE Market Map</h1>
      <div className="mt-6">
        <MarketMap stocks={quotes} profileByTicker={profileByTicker} snapshot={snapshot} foreignFlow={foreignFlow} />
      </div>
    </div>
  );
}
