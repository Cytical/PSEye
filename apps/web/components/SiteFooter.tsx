import Link from "next/link";
import { Logo } from "./Logo";
import { UpdatedAtStatus } from "./UpdatedAtStatus";
import { getMarketSnapshot } from "@/lib/marketSnapshot";
import { getMarketStatus } from "@/lib/marketStatus";

const FOOTER_LINKS = [
  { href: "/stocks", label: "All Stocks" },
  { href: "/sectors", label: "Sectors" },
  { href: "/news", label: "News" },
  { href: "/glossary", label: "Glossary" },
  { href: "/getting-started", label: "Getting Started" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

/**
 * Async (not a plain function component) so it can carry its own "last
 * updated" line — the sidebar's version of this (MarketSummaryBar) only
 * exists on the market map, so the footer's data-freshness disclaimer on
 * every other page had no timestamp to back it up. Same cached
 * `getMarketSnapshot` call every other route-level Server Component uses
 * (see MarketTicker) — costs no extra DB read beyond the shared hourly cache.
 */
export async function SiteFooter() {
  const snapshot = await getMarketSnapshot();
  // Server's reading, same as app/page.tsx's — just the seed for
  // UpdatedAtStatus's client-side state, since this layout is itself
  // ISR-cached (see root layout's `revalidate = 3600`) and would otherwise
  // freeze whichever open/closed reading happened to be true when the page
  // was last rebuilt.
  const status = getMarketStatus();

  return (
    <footer className="border-t border-foreground/10 bg-panel-raised/40">
      <div className="mx-auto flex max-w-[1600px] flex-col gap-3 px-4 py-7 text-xs text-foreground/72 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
          <div className="shrink-0 opacity-80">
            <Logo size={18} />
          </div>
          {/* Labelled so screen-reader landmark lists distinguish it from the
              header's "Main" nav rather than announcing two bare "navigation"s. */}
          <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
            {FOOTER_LINKS.map((link) => (
              <Link key={link.href} href={link.href} className="hover:text-foreground hover:underline">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        {/* "Bottom right of the page" — the disclaimer's own corner. The
            timestamp sits directly above it so a visitor weighing "how stale
            is this" reads them together instead of hunting for a clock
            somewhere else on the page. */}
        <div className="sm:max-w-md sm:text-right">
          <UpdatedAtStatus
            capturedAt={snapshot.capturedAt}
            initialStatus={status}
            className="block text-[11px] tabular-nums text-foreground/55"
          />
          <p className="mt-1">
            PSEye is a free, community-first project, not a brokerage. Data is delayed/EOD, not
            real-time, and nothing here is financial advice, a stock pick, or a buy/sell signal.
          </p>
        </div>
      </div>
    </footer>
  );
}
