import type { Metadata } from "next";
import { MockOfferingSource, OFFERING_TYPE_LABELS, type Offering, type OfferingType } from "@pseye/source-offerings";
import { manilaToday } from "@/lib/manilaDate";

export const revalidate = 86400;

// Unlinked from nav and sitemap (see NavLinks.tsx / sitemap.ts) — still on
// MockOfferingSource with no real data source found, so this page stays
// reachable by direct URL only, not discoverable/indexed, until a real
// source exists.
export const metadata: Metadata = {
  title: "PSE IPO & Offerings Tracker",
  description: "IPO, follow-on, and rights offer tracker with subscription-window countdowns.",
  alternates: { canonical: "/offerings" },
  robots: { index: false, follow: false },
};

/** Muted, theme-safe accent per offering type — same color-language approach as the calendar/disclosures pages. */
const TYPE_ACCENT: Record<OfferingType, string> = {
  ipo: "#2f8f4e",
  follow_on: "#2f6f9f",
  stock_rights: "#b8862f",
};

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

type Status = "upcoming" | "open" | "closed";

function subscriptionStatus(offering: Offering, todayIso: string): Status {
  if (todayIso < offering.subscriptionStart) return "upcoming";
  if (todayIso <= offering.subscriptionEnd) return "open";
  return "closed";
}

function statusLabel(offering: Offering, status: Status, todayIso: string): string {
  if (status === "upcoming") {
    const days = daysBetween(todayIso, offering.subscriptionStart);
    return `Opens in ${days} day${days === 1 ? "" : "s"}`;
  }
  if (status === "open") {
    const days = daysBetween(todayIso, offering.subscriptionEnd);
    return days === 0 ? "Closes today" : `${days} day${days === 1 ? "" : "s"} left`;
  }
  return "Subscription closed";
}

/**
 * "closed" has no accent — it uses the neutral panel-raised/panel-fg tokens
 * directly instead of a tint, since "subscription closed" isn't a state worth
 * drawing the eye to.
 *
 * The other two are just the base hex now, not a {bg, text} pair: used raw as
 * both a 10% fill and the label color they measured 3.67:1 light / 3.97:1
 * dark, the same way the disclosure and corporate-action type badges did. Both
 * now go through globals.css's .type-badge, which derives a per-theme label
 * from the same hue and clears AA on either surface.
 */
const STATUS_ACCENT: Partial<Record<Status, string>> = {
  upcoming: "#b8862f",
  open: "#2f8f4e",
};

/** % of the subscription window elapsed, clamped [0,100] — only meaningful while status is "open". */
function windowProgress(offering: Offering, todayIso: string): number {
  const total = daysBetween(offering.subscriptionStart, offering.subscriptionEnd);
  if (total <= 0) return 100;
  const elapsed = daysBetween(offering.subscriptionStart, todayIso);
  return Math.max(0, Math.min(100, Math.round((elapsed / total) * 100)));
}

export default async function OfferingsPage() {
  const source = new MockOfferingSource();
  const offerings = await source.getUpcoming();
  const todayIso = manilaToday();
  const sorted = [...offerings].sort((a, b) => a.subscriptionEnd.localeCompare(b.subscriptionEnd));

  return (
    <div className="mx-auto max-w-[1240px] px-4 py-8">
      <h1 className="text-2xl font-semibold tracking-tight">IPO &amp; Follow-on Offerings</h1>
      <p className="mt-1.5 text-sm text-panel-fg/72">
        Subscription windows for new listings and follow-on offers, with plain-language notes
        to help you decide whether to participate.
      </p>

      {sorted.length === 0 && (
        <p className="mt-8 rounded-lg bg-panel p-6 text-center text-sm text-panel-fg/68 ring-1 ring-panel-border">
          No upcoming offerings on record right now.
        </p>
      )}

      <div className="mt-8 flex flex-col gap-4">
        {sorted.map((offering) => {
          const status = subscriptionStatus(offering, todayIso);
          const accent = TYPE_ACCENT[offering.type];
          const statusAccent = STATUS_ACCENT[status];
          const statusClassName =
            "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold" +
            (statusAccent ? " type-badge" : " bg-panel-raised text-panel-fg/72");
          return (
            <div
              key={`${offering.companyName}-${offering.type}-${offering.subscriptionStart}`}
              className="overflow-hidden rounded-lg bg-panel p-4 ring-1 ring-panel-border"
              style={{ borderLeft: `3px solid ${accent}` }}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {offering.url ? (
                    <a
                      href={offering.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-medium text-panel-fg hover:underline"
                    >
                      {offering.companyName} <span aria-hidden="true">↗</span>
                    </a>
                  ) : (
                    <span className="font-medium text-panel-fg">{offering.companyName}</span>
                  )}
                  {offering.ticker && (
                    <span className="rounded bg-panel-raised px-1.5 py-0.5 font-mono text-[10px] text-panel-fg/80">
                      {offering.ticker}
                    </span>
                  )}
                  <span
                    className="type-badge rounded-full px-2 py-0.5 text-[10px] font-medium"
                    style={{ "--badge-accent": accent } as React.CSSProperties}
                  >
                    {OFFERING_TYPE_LABELS[offering.type]}
                  </span>
                  <span className="text-xs text-panel-fg/68">{offering.sector}</span>
                </div>
                <span
                  className={statusClassName}
                  style={statusAccent ? ({ "--badge-accent": statusAccent } as React.CSSProperties) : undefined}
                >
                  {statusLabel(offering, status, todayIso)}
                </span>
              </div>

              <p className="mt-2.5 text-sm text-panel-fg">{offering.summary}</p>

              {status === "open" && (
                <div className="mt-3 h-1 overflow-hidden rounded-full bg-panel-raised">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${windowProgress(offering, todayIso)}%`, backgroundColor: accent }}
                  />
                </div>
              )}

              <div className="mt-2.5 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-panel-fg/68">
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

      <p className="mt-8 text-xs text-panel-fg/72">
        Sample data, including fictional pre-IPO company names. A real offering-disclosure
        tracker isn&apos;t wired in yet. Not financial advice.
      </p>
    </div>
  );
}
