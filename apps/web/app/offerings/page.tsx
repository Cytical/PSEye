import { MockOfferingSource, OFFERING_TYPE_LABELS, type Offering } from "@pseye/source-offerings";

export const revalidate = 86400;

function daysBetween(fromIso: string, toIso: string): number {
  const from = new Date(fromIso + "T00:00:00Z").getTime();
  const to = new Date(toIso + "T00:00:00Z").getTime();
  return Math.round((to - from) / 86_400_000);
}

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00Z").toLocaleDateString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function subscriptionStatus(offering: Offering, todayIso: string): string {
  if (todayIso < offering.subscriptionStart) {
    const days = daysBetween(todayIso, offering.subscriptionStart);
    return `Opens in ${days} day${days === 1 ? "" : "s"}`;
  }
  if (todayIso <= offering.subscriptionEnd) {
    const days = daysBetween(todayIso, offering.subscriptionEnd);
    return days === 0 ? "Closes today" : `${days} day${days === 1 ? "" : "s"} left to subscribe`;
  }
  return "Subscription closed";
}

export default async function OfferingsPage() {
  const source = new MockOfferingSource();
  const offerings = await source.getUpcoming();
  const todayIso = new Date().toISOString().slice(0, 10);
  const sorted = [...offerings].sort((a, b) => a.subscriptionEnd.localeCompare(b.subscriptionEnd));

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-xl font-semibold">IPO &amp; Follow-on Offerings</h1>
      <p className="mt-1 text-sm text-black/60 dark:text-white/60">
        Subscription windows for new listings and follow-on offers, with plain-language
        context for deciding whether to participate.
      </p>

      <div className="mt-6 flex flex-col gap-4">
        {sorted.map((offering) => {
          const isOpen = todayIso >= offering.subscriptionStart && todayIso <= offering.subscriptionEnd;
          return (
            <div
              key={`${offering.companyName}-${offering.type}-${offering.subscriptionStart}`}
              className="rounded-md border border-black/10 p-4 dark:border-white/10"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{offering.companyName}</span>
                  {offering.ticker && (
                    <span className="rounded bg-black/5 px-1.5 py-0.5 font-mono text-[10px] dark:bg-white/10">
                      {offering.ticker}
                    </span>
                  )}
                  <span className="rounded-full border border-black/15 px-2 py-0.5 text-[10px] dark:border-white/15">
                    {OFFERING_TYPE_LABELS[offering.type]}
                  </span>
                  <span className="text-xs text-black/50 dark:text-white/50">{offering.sector}</span>
                </div>
                <span
                  className={`text-xs font-medium ${isOpen ? "text-[#006300] dark:text-[#0ca30c]" : "text-black/50 dark:text-white/50"}`}
                >
                  {subscriptionStatus(offering, todayIso)}
                </span>
              </div>

              <p className="mt-2 text-sm">{offering.summary}</p>

              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-black/50 dark:text-white/50">
                <span>Offer price: ₱{offering.offerPrice.toFixed(2)}</span>
                <span>
                  Subscription: {formatDate(offering.subscriptionStart)} &ndash;{" "}
                  {formatDate(offering.subscriptionEnd)}
                </span>
                {offering.listingDate && <span>Listing: {formatDate(offering.listingDate)}</span>}
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-black/40 dark:text-white/40">
        Sample data, including fictional pre-IPO company names — a real offering-disclosure
        tracker has not been wired in yet. Not financial advice.
      </p>
    </div>
  );
}
