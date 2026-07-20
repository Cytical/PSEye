import Link from "next/link";
import { Logo } from "./Logo";

const FOOTER_LINKS = [
  { href: "/stocks", label: "All Stocks" },
  { href: "/news", label: "News" },
  { href: "/feed.xml", label: "RSS" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-foreground/10">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-6 text-xs text-foreground/60 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5">
          <div className="shrink-0 opacity-70">
            <Logo size={18} />
          </div>
          <nav className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
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
