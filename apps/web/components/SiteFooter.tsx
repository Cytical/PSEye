import Link from "next/link";
import { Logo } from "./Logo";

const FOOTER_LINKS = [
  { href: "/stocks", label: "All Stocks" },
  { href: "/sectors", label: "Sectors" },
  { href: "/news", label: "News" },
  { href: "/glossary", label: "Glossary" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function SiteFooter() {
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
        <p className="sm:max-w-md sm:text-right">
          PSEye is a free, community-first project — not a brokerage. Data is delayed/EOD, not
          real-time, and nothing here is financial advice, a stock pick, or a buy/sell signal.
        </p>
      </div>
    </footer>
  );
}
