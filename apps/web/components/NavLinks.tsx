"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Market Map" },
  { href: "/charts", label: "Charts" },
  { href: "/news", label: "News" },
  { href: "/calendar", label: "Calendar" },
  { href: "/block-sales", label: "Block Sales" },
  { href: "/disclosures", label: "Disclosures" },
  { href: "/offerings", label: "Offerings" },
  { href: "/foreign-flow", label: "Foreign Flow" },
  { href: "/dca", label: "DCA Calculator" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <>
      {LINKS.map((link) => {
        const isActive = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={isActive ? "page" : undefined}
            className={
              isActive
                ? "font-medium opacity-100"
                : "opacity-70 hover:opacity-100"
            }
          >
            {link.label}
          </Link>
        );
      })}
    </>
  );
}
